# Chess History

A Nuxt 3 application for storing and replaying chess games. Import games in PGN format or extract game data from chess board images using AI-powered OCR.

## Features

- **Game Storage**: SQLite database to store chess games and moves
- **Multiple Import Methods**:
  - PGN Import: Import standard PGN files
  - **OCR Chess**: Extract game data from chess board images using Claude AI
- **Interactive Replay**: Play through games with controls and move list
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository or copy the project files
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Database

The application uses SQLite for storage. The database file is automatically created at `./data/chess.db` when you first run the application.

### Database Schema

- **games** table: stores game metadata (id, name, players, source, date)
- **moves** table: stores individual moves with SAN notation and resulting FEN

### Resetting the Database

To reset the database, simply delete the `data/chess.db` file:

```bash
rm data/chess.db
```

The database will be recreated automatically when you restart the application.

## PGN Format

The application accepts standard PGN (Portable Game Notation) format. You can paste PGN content directly into the import form.

## OCR Chess - Image Import

Upload images of chess boards to automatically extract game data using Claude AI's vision capabilities.

### Supported Image Formats
- PNG, JPG, JPEG
- Chess board diagrams or screenshots
- Position photos from chess apps/websites

### How It Works
1. Upload an image containing a chess board
2. Claude AI analyzes the image to identify:
   - Piece positions
   - Board orientation
   - Game state
3. The position is converted to FEN notation
4. A new game is created with the extracted position

### Setup
To use OCR Chess, you need to configure your Anthropic API key:

1. Copy `.env.example` to `.env`
2. Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

### Image Tips
- Ensure the chess board is clearly visible
- Good contrast between pieces and squares
- Standard chess piece symbols work best
- Board should be properly oriented (white on bottom for standard view)

## API Endpoints

The application provides the following REST API endpoints:

- `GET /api/games` - List all games
- `GET /api/games/[id]` - Get game details and moves
- `DELETE /api/games/[id]` - Delete a game
- `POST /api/games/import-pgn` - Import game from PGN content
- `POST /api/games/save-manual` - Save manually created game
- `POST /api/ocr-chess` - Extract game data from chess board image

## Technologies Used

- **Nuxt 3**: Vue.js framework with server-side rendering
- **SQLite**: Database via better-sqlite3
- **chess.js**: Chess game logic and move validation
- **chessground**: Interactive chess board component
- **TailwindCSS**: Styling and responsive design
- **Anthropic Claude AI**: Image analysis and OCR for chess board recognition

## Game Replay Features

- **Navigation Controls**: Go to start/end, previous/next move
- **Auto-play**: Automatically advance through moves
- **Move List**: Click on any move to jump to that position
- **Position Slider**: Scrub through the game timeline
- **Responsive Board**: Chess board adapts to screen size

## Limitations

- Single game per picture upload
- SAN notation only (no long algebraic notation)
- Read-only board (no move input during replay)
- Basic error handling and validation

## Development

### Building for Production

```bash
npm run build
```

### Project Structure

```
├── server/
│   ├── api/          # API endpoints
│   └── utils/        # Database utilities
├── pages/            # Vue pages/routes
├── components/       # Vue components
├── composables/      # Vue composables
├── assets/css/       # Stylesheets
└── data/             # SQLite database (auto-created)
```

## License

This project is for educational and personal use.
