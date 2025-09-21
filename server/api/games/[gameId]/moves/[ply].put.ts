import { statements, db } from '@/server/utils/db'
import { Chess } from 'chess.js'

interface UpdateMoveRequest {
  san: string
}

export default defineEventHandler(async (event) => {
  try {
    const gameId = getRouterParam(event, 'gameId')
    const ply = parseInt(getRouterParam(event, 'ply') || '0')
    const { san }: UpdateMoveRequest = await readBody(event)

    if (!gameId || !ply || !san?.trim()) {
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

    // Get all moves for this game up to the ply being updated
    const allMoves = statements.getMoves.all(gameId) as Array<{ ply: number; san: string; fen_after: string }>
    const moveToUpdate = allMoves.find(m => m.ply === ply)

    if (!moveToUpdate) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Move not found'
      })
    }

    // Recalculate FEN positions from the beginning with the new move
    const chess = new Chess()
    let newFenAfter = chess.fen()

    // Play all moves up to the one being updated
    for (const move of allMoves.sort((a, b) => a.ply - b.ply)) {
      if (move.ply < ply) {
        try {
          const chessMove = chess.move(move.san, { strict: false })
          if (chessMove) {
            newFenAfter = chess.fen()
          }
        } catch {
          // Keep previous FEN for illegal moves
        }
      } else if (move.ply === ply) {
        // This is the move we're updating
        try {
          const chessMove = chess.move(san.trim(), { strict: false })
          if (chessMove) {
            newFenAfter = chess.fen()
          }
          // If move is illegal, keep the previous FEN
        } catch {
          // Keep previous FEN for illegal moves
        }
        break
      }
    }

    // Update the move in database
    const updateMoveStatement = db.prepare(`
      UPDATE moves
      SET san = ?, fen_after = ?
      WHERE game_id = ? AND ply = ?
    `)

    updateMoveStatement.run(san.trim(), newFenAfter, gameId, ply)

    // Recalculate all subsequent moves with correct FEN positions
    const subsequentMoves = allMoves.filter(m => m.ply > ply).sort((a, b) => a.ply - b.ply)

    for (const move of subsequentMoves) {
      try {
        const chessMove = chess.move(move.san, { strict: false })
        if (chessMove) {
          const updatedFen = chess.fen()
          updateMoveStatement.run(move.san, updatedFen, gameId, move.ply)
        } else {
          // Illegal move - keep current FEN
          updateMoveStatement.run(move.san, chess.fen(), gameId, move.ply)
        }
      } catch {
        // Illegal move - keep current FEN
        updateMoveStatement.run(move.san, chess.fen(), gameId, move.ply)
      }
    }

    return {
      message: 'Move updated successfully'
    }
  } catch (error: any) {
    console.error('Error updating move:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update move'
    })
  }
})