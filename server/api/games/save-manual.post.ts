import { statements, db } from '@/server/utils/db'
import { v4 as uuidv4 } from 'uuid'
import { Chess } from 'chess.js'

interface SaveGameRequest {
  rows: Array<{ n: number; w: string; b: string }>
  name?: string
  white?: string
  black?: string
}

export default defineEventHandler(async (event) => {
  try {
    const { rows, name, white, black }: SaveGameRequest = await readBody(event)

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No moves to save'
      })
    }

    // Convert rows to moves for database storage (including illegal moves)
    const moves: Array<{ ply: number; san: string; fen_after: string }> = []
    const chess = new Chess()
    let ply = 1

    for (const row of rows.sort((a, b) => a.n - b.n)) {
      // Process white move
      if (row.w && row.w.trim()) {
        const moveText = row.w.trim()

        // Check if it's valid notation format
        const isValidNotation = moveText.match(/^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?(\+|\#)?$/) ||
                               moveText.match(/^O-O(-O)?(\+|\#)?$/)

        if (isValidNotation) {
          try {
            const move = chess.move(moveText, { strict: false })
            if (move) {
              // Legal move - save with proper FEN
              moves.push({
                ply,
                san: move.san,
                fen_after: chess.fen()
              })
            } else {
              // Illegal move - save as-is with current FEN (don't advance chess position)
              moves.push({
                ply,
                san: moveText,
                fen_after: chess.fen()
              })
            }
          } catch {
            // Save illegal move as-is
            moves.push({
              ply,
              san: moveText,
              fen_after: chess.fen()
            })
          }
          ply++
        }
      }

      // Process black move
      if (row.b && row.b.trim()) {
        const moveText = row.b.trim()

        // Check if it's valid notation format
        const isValidNotation = moveText.match(/^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?(\+|\#)?$/) ||
                               moveText.match(/^O-O(-O)?(\+|\#)?$/)

        if (isValidNotation) {
          try {
            const move = chess.move(moveText, { strict: false })
            if (move) {
              // Legal move - save with proper FEN
              moves.push({
                ply,
                san: move.san,
                fen_after: chess.fen()
              })
            } else {
              // Illegal move - save as-is with current FEN
              moves.push({
                ply,
                san: moveText,
                fen_after: chess.fen()
              })
            }
          } catch {
            // Save illegal move as-is
            moves.push({
              ply,
              san: moveText,
              fen_after: chess.fen()
            })
          }
          ply++
        }
      }
    }

    if (moves.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid moves to save'
      })
    }

    // Save game to database
    const gameId = uuidv4()
    const createdAt = new Date().toISOString()

    const transaction = db.transaction(() => {
      statements.insertGame.run(
        gameId,
        name || `Game ${new Date().toLocaleDateString()}`,
        white || 'Player 1',
        black || 'Player 2',
        'ocr',
        createdAt
      )

      for (const move of moves) {
        statements.insertMove.run(gameId, move.ply, move.san, move.fen_after)
      }
    })

    transaction()

    return {
      id: gameId,
      message: 'Game saved successfully'
    }
  } catch (error: any) {
    console.error('Error saving game:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to save game'
    })
  }
})