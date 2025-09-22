import cv2
import numpy as np
import json
import argparse
from pathlib import Path
from typing import List, Tuple, Dict

def detect_table_lines(image: np.ndarray) -> Tuple[List[int], List[int]]:
    """
    Detect horizontal and vertical lines in the table using Hough Line Transform
    Returns lists of horizontal and vertical line positions
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Apply adaptive threshold to get binary image
    binary = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 2)

    # Detect horizontal lines
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)

    # Detect vertical lines
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)

    # Find horizontal line positions
    h_lines = []
    horizontal_contours, _ = cv2.findContours(horizontal_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for contour in horizontal_contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w > image.shape[1] * 0.3:  # Only consider long horizontal lines
            h_lines.append(y + h//2)

    # Find vertical line positions
    v_lines = []
    vertical_contours, _ = cv2.findContours(vertical_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for contour in vertical_contours:
        x, y, w, h = cv2.boundingRect(contour)
        if h > image.shape[0] * 0.3:  # Only consider long vertical lines
            v_lines.append(x + w//2)

    # Sort and remove duplicates
    h_lines = sorted(list(set(h_lines)))
    v_lines = sorted(list(set(v_lines)))

    return h_lines, v_lines

def extract_table_cells(image: np.ndarray, h_lines: List[int], v_lines: List[int]) -> List[List[np.ndarray]]:
    """
    Extract individual cells from the table based on detected line positions
    """
    cells = []

    # Create grid of cells
    for i in range(len(h_lines) - 1):
        row_cells = []
        y1, y2 = h_lines[i], h_lines[i + 1]

        # Skip rows that are too thin (likely duplicate line detection)
        if y2 - y1 < 10:
            continue

        for j in range(len(v_lines) - 1):
            x1, x2 = v_lines[j], v_lines[j + 1]

            # Add small padding to avoid border lines, but ensure we don't make cell too small
            padding = min(3, (y2 - y1) // 4, (x2 - x1) // 4)

            # Ensure we have valid bounds
            y_start = max(0, y1 + padding)
            y_end = min(image.shape[0], y2 - padding)
            x_start = max(0, x1 + padding)
            x_end = min(image.shape[1], x2 - padding)

            # Only create cell if dimensions are reasonable
            if y_end > y_start and x_end > x_start:
                cell = image[y_start:y_end, x_start:x_end]
                row_cells.append(cell)
            else:
                # Create a small placeholder for invalid cells
                placeholder = np.ones((20, 50, 3), dtype=np.uint8) * 255
                row_cells.append(placeholder)

        # Only add rows that have the expected number of columns
        if len(row_cells) >= 6:  # Expecting 6 columns for chess sheets
            cells.append(row_cells)

    return cells

def identify_chess_moves_columns(cells: List[List[np.ndarray]]) -> Dict:
    """
    Identify which columns contain move numbers, white moves, and black moves
    Chess tables typically have: Left block (1-20) with [num, white, black] and Right block (21-40) with [num, white, black]
    """
    if not cells or not cells[0]:
        return {}

    num_cols = len(cells[0])
    col_info = {}

    # For chess result sheets, we expect 6 columns: left_num, left_white, left_black, right_num, right_white, right_black
    if num_cols >= 6:
        col_info = {
            'left_num_col': 0,
            'left_white_col': 1,
            'left_black_col': 2,
            'right_num_col': 3,
            'right_white_col': 4,
            'right_black_col': 5
        }
    # Fallback for 3 columns (single block)
    elif num_cols >= 3:
        col_widths = [cell.shape[1] for cell in cells[0]]
        min_width_idx = col_widths.index(min(col_widths))
        col_info = {
            'left_num_col': min_width_idx,
            'left_white_col': (min_width_idx + 1) % num_cols,
            'left_black_col': (min_width_idx + 2) % num_cols
        }

    return col_info

def save_chess_moves(cells: List[List[np.ndarray]], col_info: Dict, output_dir: Path, base_name: str):
    """
    Save individual chess move cells with proper naming
    """
    # Create game-specific folder in output directory
    game_output_dir = output_dir / "output" / base_name
    game_output_dir.mkdir(parents=True, exist_ok=True)

    # Create debug directory
    debug_dir = output_dir / "debug"
    debug_dir.mkdir(exist_ok=True)

    moves_data = []
    move_counter = 1

    # Find the actual start row by looking for the first row with move data
    start_row = 0
    for i, row in enumerate(cells):
        if len(row) > col_info.get('left_white_col', 1):
            cell = row[col_info.get('left_white_col', 1)]
            # Check if this looks like a data row (not header) by examining cell content
            if cell is not None and cell.size > 0 and min(cell.shape[:2]) > 10:
                # Check if this cell looks like chess notation (not header text)
                # Header rows typically have uniform background or text like "БЕЛЫЕ"
                # Data rows have chess moves written by hand
                cell_mean = cell.mean()
                # If the cell is mostly white (header) or very uniform, skip it
                if cell_mean > 240 or cell.std() < 10:
                    continue
                start_row = i
                break

    for row_idx in range(start_row, len(cells)):
        row = cells[row_idx]

        # Only process rows that represent valid game moves (limit to 20 rows for chess)
        if move_counter > 20:
            break

        # Process left block (moves 1-20) - ALWAYS generate files
        if len(row) > col_info.get('left_white_col', 1):
            # Left white move
            left_white_cell = row[col_info.get('left_white_col', 1)]
            white_filename = f"{base_name}_{move_counter:02d}_w.png"
            try:
                # Check if cell is valid before saving
                if left_white_cell is not None and left_white_cell.size > 0 and min(left_white_cell.shape[:2]) > 5:
                    cv2.imwrite(str(game_output_dir / white_filename), left_white_cell)
                    moves_data.append({
                        "n": move_counter,
                        "side": "w",
                        "file": f"output/{base_name}/{white_filename}"
                    })
                else:
                    raise ValueError(f"Invalid cell for white move {move_counter}")
            except Exception as e:
                print(f"⚠️  Error cropping white move {move_counter}: {e}")
                print(f"    Cell shape: {left_white_cell.shape if left_white_cell is not None else 'None'}")
                # Create a small blank placeholder image
                placeholder = np.ones((30, 80, 3), dtype=np.uint8) * 255
                cv2.imwrite(str(game_output_dir / white_filename), placeholder)
                moves_data.append({
                    "n": move_counter,
                    "side": "w",
                    "file": f"output/{base_name}/{white_filename}"
                })
                print(f"⚠️  Created placeholder for white move {move_counter}")

            # Left black move
            if len(row) > col_info.get('left_black_col', 2):
                left_black_cell = row[col_info.get('left_black_col', 2)]
                black_filename = f"{base_name}_{move_counter:02d}_b.png"
                try:
                    # Check if cell is valid before saving
                    if left_black_cell is not None and left_black_cell.size > 0 and min(left_black_cell.shape[:2]) > 5:
                        cv2.imwrite(str(game_output_dir / black_filename), left_black_cell)
                        moves_data.append({
                            "n": move_counter,
                            "side": "b",
                            "file": f"output/{base_name}/{black_filename}"
                        })
                    else:
                        raise ValueError(f"Invalid cell for black move {move_counter}")
                except Exception as e:
                    print(f"⚠️  Error cropping black move {move_counter}: {e}")
                    print(f"    Cell shape: {left_black_cell.shape if left_black_cell is not None else 'None'}")
                    # Create a small blank placeholder image
                    placeholder = np.ones((30, 80, 3), dtype=np.uint8) * 255
                    cv2.imwrite(str(game_output_dir / black_filename), placeholder)
                    moves_data.append({
                        "n": move_counter,
                        "side": "b",
                        "file": f"output/{base_name}/{black_filename}"
                    })
                    print(f"⚠️  Created placeholder for black move {move_counter}")

        # Process right block (moves 21-40) - ALWAYS generate files
        right_move_num = move_counter + 20
        if len(row) > col_info.get('right_white_col', 4):
            # Right white move
            right_white_cell = row[col_info.get('right_white_col', 4)]
            white_filename = f"{base_name}_{right_move_num:02d}_w.png"
            try:
                cv2.imwrite(str(game_output_dir / white_filename), right_white_cell)
                moves_data.append({
                    "n": right_move_num,
                    "side": "w",
                    "file": f"output/{base_name}/{white_filename}"
                })
            except:
                # Create a small blank placeholder image
                placeholder = np.ones((30, 80, 3), dtype=np.uint8) * 255
                cv2.imwrite(str(game_output_dir / white_filename), placeholder)
                moves_data.append({
                    "n": right_move_num,
                    "side": "w",
                    "file": f"output/{base_name}/{white_filename}"
                })
                print(f"⚠️  Created placeholder for white move {right_move_num}")

            # Right black move
            if len(row) > col_info.get('right_black_col', 5):
                right_black_cell = row[col_info.get('right_black_col', 5)]
                black_filename = f"{base_name}_{right_move_num:02d}_b.png"
                try:
                    cv2.imwrite(str(game_output_dir / black_filename), right_black_cell)
                    moves_data.append({
                        "n": right_move_num,
                        "side": "b",
                        "file": f"output/{base_name}/{black_filename}"
                    })
                except:
                    # Create a small blank placeholder image
                    placeholder = np.ones((30, 80, 3), dtype=np.uint8) * 255
                    cv2.imwrite(str(game_output_dir / black_filename), placeholder)
                    moves_data.append({
                        "n": right_move_num,
                        "side": "b",
                        "file": f"output/{base_name}/{black_filename}"
                    })
                    print(f"⚠️  Created placeholder for black move {right_move_num}")

        move_counter += 1

    # Save index mapping to debug directory
    with open(debug_dir / f"{base_name}_index_map.json", "w") as f:
        json.dump(moves_data, f, indent=2)

    return len(moves_data)

def create_debug_overlay(image: np.ndarray, h_lines: List[int], v_lines: List[int],
                        output_path: Path) -> None:
    """
    Create debug image showing detected lines and grid
    """
    debug_img = image.copy()

    # Draw horizontal lines in red
    for y in h_lines:
        cv2.line(debug_img, (0, y), (image.shape[1], y), (0, 0, 255), 2)

    # Draw vertical lines in blue
    for x in v_lines:
        cv2.line(debug_img, (x, 0), (x, image.shape[0]), (255, 0, 0), 2)

    cv2.imwrite(str(output_path), debug_img)

def main():
    parser = argparse.ArgumentParser(description="Smart chess table cropper using line detection")
    parser.add_argument("--image", required=True, help="Path to the chess result sheet image")
    parser.add_argument("--out", default="./out", help="Output directory")
    parser.add_argument("--basename", help="Base name for output files")
    parser.add_argument("--debug", action="store_true", help="Save debug overlay image")

    args = parser.parse_args()

    # Load image
    image_path = Path(args.image)
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")

    image = cv2.imread(str(image_path))
    if image is None:
        raise SystemExit("Failed to read image")

    # Setup output
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    base_name = args.basename or image_path.stem

    print("🔍 Detecting table structure...")

    # Detect table lines
    h_lines, v_lines = detect_table_lines(image)

    print(f"📏 Found {len(h_lines)} horizontal lines and {len(v_lines)} vertical lines")

    if len(h_lines) < 2 or len(v_lines) < 2:
        raise SystemExit("Could not detect enough table lines. Try adjusting the image or detection parameters.")

    # Extract cells
    print("✂️  Extracting table cells...")
    cells = extract_table_cells(image, h_lines, v_lines)

    # Identify column structure
    col_info = identify_chess_moves_columns(cells)
    print(f"📋 Detected column structure: {col_info}")

    # Save chess moves
    print("💾 Saving chess move cells...")
    num_moves = save_chess_moves(cells, col_info, output_dir, base_name)

    # Create debug overlay
    if args.debug:
        debug_path = output_dir / "debug" / f"{base_name}_debug_lines.jpg"
        create_debug_overlay(image, h_lines, v_lines, debug_path)
        print(f"🖼️  Debug overlay saved: {debug_path}")

    print(f"✅ Successfully extracted {num_moves} chess move cells!")
    print(f"📁 Output directory: {output_dir}")

if __name__ == "__main__":
    main()