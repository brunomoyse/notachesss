import { statements, db } from '@/server/utils/db'
import { Chess } from 'chess.js'

interface InsertMoveRequest {
  afterPly: number
  san: string
}

export default defineEventHandler(async (event) => {
  try {
    const gameId = getRouterParam(event, 'gameId')
    const { afterPly, san }: InsertMoveRequest = await readBody(event)

    if (!gameId || afterPly === undefined || !san?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    // Verify game exists
    const game = statements.getGame.get(gameId)
    if (!game) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    // Get all moves for this game
    const allMoves = statements.getMoves.all(gameId) as Array<{ ply: number; san: string; fen_after: string }>

    // Sort moves by ply
    allMoves.sort((a, b) => a.ply - b.ply)

    // Find the insertion point
    const insertionIndex = allMoves.findIndex(move => move.ply > afterPly)
    const insertionPly = afterPly + 1

    // Update ply numbers for all moves that come after the insertion point
    const updatePlyStatement = db.prepare(`
      UPDATE moves
      SET ply = ply + 1
      WHERE game_id = ? AND ply >= ?
    `)

    // Shift all moves that come after the insertion point
    updatePlyStatement.run(gameId, insertionPly)

    // Now calculate the correct FEN position for the new move
    const chess = new Chess()
    let currentFen = chess.fen()

    // Play all moves up to the insertion point
    for (const move of allMoves) {
      if (move.ply < insertionPly) {
        try {
          const chessMove = chess.move(move.san, { strict: false })
          if (chessMove) {
            currentFen = chess.fen()
          }
        } catch {
          // Keep previous FEN for illegal moves
        }
      } else {
        // Stop before the insertion point
        break
      }
    }

    // Try to play the new move
    let newMoveFen = currentFen
    try {
      const chessMove = chess.move(san.trim(), { strict: false })
      if (chessMove) {
        newMoveFen = chess.fen()
      }
    } catch {
      // Keep current FEN for illegal moves
    }

    // Insert the new move
    statements.insertMove.run(gameId, insertionPly, san.trim(), newMoveFen)

    // Recalculate FEN positions for all subsequent moves
    const subsequentMoves = allMoves.filter(move => move.ply >= insertionPly).sort((a, b) => (a.ply + 1) - (b.ply + 1))

    const updateMoveFenStatement = db.prepare(`
      UPDATE moves
      SET fen_after = ?
      WHERE game_id = ? AND ply = ?
    `)

    for (const move of subsequentMoves) {
      const newPly = move.ply + 1 // Account for the shift
      try {
        const chessMove = chess.move(move.san, { strict: false })
        if (chessMove) {
          const updatedFen = chess.fen()
          updateMoveFenStatement.run(updatedFen, gameId, newPly)
        } else {
          // Illegal move - keep current FEN
          updateMoveFenStatement.run(chess.fen(), gameId, newPly)
        }
      } catch {
        // Illegal move - keep current FEN
        updateMoveFenStatement.run(chess.fen(), gameId, newPly)
      }
    }

    return {
      message: 'Move inserted successfully'
    }
  } catch (error: any) {
    console.error('Error inserting move:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to insert move'
    })
  }
})