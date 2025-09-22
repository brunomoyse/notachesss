# Chess Scoresheet Cropper Tool

Automatically extracts individual chess moves from scoresheet images using intelligent line detection.

## Overview

This tool processes chess scoresheet images and extracts each move into separate image files. It supports the standard tournament scoresheet format with two blocks (moves 1-20 and 21-40), each containing move numbers, white moves, and black moves.

## Features

- **Automatic line detection**: No manual configuration needed
- **Smart cropping**: Handles handwritten scoresheets with varying line quality
- **Proper naming**: Generates consistently named files (`game-X_MM_w.png`, `game-X_MM_b.png`)
- **Debug visualization**: Shows detected table structure for troubleshooting
- **Error handling**: Robust extraction with fallback for problematic cells

## Quick Start

### Using Docker (Recommended)

1. **Build the container:**
   ```bash
   docker build -t cropper-tool .
   ```

2. **Crop a scoresheet:**
   ```bash
   docker run --rm \
     -v "$(pwd)/input:/app/input" \
     -v "$(pwd):/app/output" \
     cropper-tool \
     --image input/your-scoresheet.png \
     --out output \
     --basename game-1 \
     --debug
   ```

### Parameters

- `--image`: Path to your scoresheet image (required)
- `--out`: Output directory (default: `./out`)
- `--basename`: Base name for output files (default: image filename)
- `--debug`: Generate debug overlay showing detected lines

## Output Files

The tool generates:

- **Move files**: Located in `output/{basename}/`
  - Format: `{basename}_{move:02d}_{w|b}.png`
  - Moves 1-20 (left block) and 21-40 (right block)
- **Index mapping**: Located in `debug/{basename}_index_map.json`
  - JSON file mapping move numbers to file paths
- **Debug overlay**: Located in `debug/{basename}_debug_lines.jpg` (if `--debug` used)
  - Visual representation of detected table lines

## Example

```bash
# Process game-13.png
docker run --rm \
  -v "$(pwd)/input:/app/input" \
  -v "$(pwd):/app/output" \
  cropper-tool \
  --image input/game-13.png \
  --basename game-13 \
  --debug
```

**Output:**
```
output/
└── game-13/
    ├── game-13_01_w.png  # Move 1, White
    ├── game-13_01_b.png  # Move 1, Black
    ├── game-13_02_w.png  # Move 2, White
    ├── ...
    ├── game-13_20_w.png  # Move 20, White
    ├── game-13_21_w.png  # Move 21, White (right block)
    └── ...
debug/
├── game-13_index_map.json
└── game-13_debug_lines.jpg
```

## Image Requirements

- **Format**: PNG, JPG, or other common image formats
- **Quality**: Clear table lines (hand-drawn lines are fine)
- **Structure**: Standard tournament scoresheet with:
  - Header row with column labels
  - Two blocks side by side (left: moves 1-20, right: moves 21-40)
  - Six columns total: [num, white, black] × 2

## Troubleshooting

### Check Debug Overlay
If crops don't align correctly, examine the debug overlay:
- **Red lines**: Horizontal row boundaries
- **Blue lines**: Vertical column boundaries
- Lines should align with your table structure

### Common Issues

1. **Missing moves**: Check if table lines are clearly visible
2. **Wrong alignment**: Verify scoresheet follows standard format
3. **Blank crops**: Usually indicates very thin rows or detection issues


## Files

- `smart_crop.py`: Automatic cropping tool with intelligent line detection
- `requirements.txt`: Python dependencies
- `Dockerfile`: Container configuration

## Dependencies

- Python 3.11+
- OpenCV (`opencv-python-headless`)
- NumPy
- Pillow
- Typer (CLI)

---

**Example scoresheet format:**
```
№ | БЕЛЫЕ  | ЧЕРНЫЕ | № | БЕЛЫЕ  | ЧЕРНЫЕ
1 | d4     | d5     |21 | Rf6    | Bb7
2 | c4     | c6     |22 | a3     | Re8
...
```