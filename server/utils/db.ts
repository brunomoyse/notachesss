import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const DB_PATH = join(process.cwd(), 'data', 'chess.db')

// Ensure data directory exists
const dataDir = join(process.cwd(), 'data')
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const db = new Database(DB_PATH, { readonly: false, fileMustExist: false })

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    white TEXT,
    black TEXT,
    source TEXT NOT NULL CHECK (source IN ('csv','pgn','manual','ocr')),
    created_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    ply INTEGER NOT NULL,
    san TEXT NOT NULL,
    fen_after TEXT NOT NULL
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_moves_game_ply ON moves(game_id, ply)
`)

// Create table for user-specific OCR corrections (personalized handwriting learning)
db.exec(`
  CREATE TABLE IF NOT EXISTS ocr_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ocr_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    confidence_score REAL DEFAULT 1.0,
    times_used INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    UNIQUE(ocr_text, corrected_text)
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_ocr_corrections_text ON ocr_corrections(ocr_text)
`)

// Prepared statements
export const statements = {
  insertGame: db.prepare(`
    INSERT INTO games (id, name, white, black, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  insertMove: db.prepare(`
    INSERT INTO moves (game_id, ply, san, fen_after)
    VALUES (?, ?, ?, ?)
  `),

  getGames: db.prepare(`
    SELECT id, name, white, black, created_at
    FROM games
    ORDER BY created_at DESC
  `),

  getGame: db.prepare(`
    SELECT id, name, white, black, source, created_at
    FROM games
    WHERE id = ?
  `),

  getMoves: db.prepare(`
    SELECT ply, san, fen_after
    FROM moves
    WHERE game_id = ?
    ORDER BY ply ASC
  `),

  // OCR correction learning statements
  insertOcrCorrection: db.prepare(`
    INSERT OR REPLACE INTO ocr_corrections (ocr_text, corrected_text, confidence_score, times_used, created_at)
    VALUES (?, ?,
      COALESCE((SELECT confidence_score + 0.1 FROM ocr_corrections WHERE ocr_text = ? AND corrected_text = ?), 1.0),
      COALESCE((SELECT times_used + 1 FROM ocr_corrections WHERE ocr_text = ? AND corrected_text = ?), 1),
      ?)
  `),

  getOcrCorrections: db.prepare(`
    SELECT ocr_text, corrected_text, confidence_score, times_used
    FROM ocr_corrections
    WHERE ocr_text = ?
    ORDER BY confidence_score DESC, times_used DESC
  `),

  getAllOcrCorrections: db.prepare(`
    SELECT ocr_text, corrected_text, confidence_score, times_used
    FROM ocr_corrections
    ORDER BY confidence_score DESC, times_used DESC
  `)
}

export { db }