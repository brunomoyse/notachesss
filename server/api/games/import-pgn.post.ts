import { Chess } from 'chess.js'
import { v4 as uuidv4 } from 'uuid'
import { statements, db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body || !body.pgn) {
      throw createError({
        statusCode: 400,
        statusMessage: 'PGN content is required'
      })
    }

    const { pgn, name, white, black } = body

    const chess = new Chess()

    try {
      chess.loadPgn(pgn)
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid PGN format'
      })
    }

    // Get the move history
    const history = chess.history({ verbose: true })

    if (history.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'PGN contains no moves'
      })
    }

    // Replay moves to get FEN after each move
    const chessReplay = new Chess()
    const validatedMoves: Array<{ ply: number; san: string; fen_after: string }> = []

    for (let i = 0; i < history.length; i++) {
      const move = history[i]
      chessReplay.move(move.san)
      validatedMoves.push({
        ply: i + 1,
        san: move.san,
        fen_after: chessReplay.fen()
      })
    }

    // Extract game metadata
    const gameName = name || chess.header().Event || `PGN Game ${new Date().toLocaleDateString()}`
    const whitePlayer = white || chess.header().White || 'Unknown'
    const blackPlayer = black || chess.header().Black || 'Unknown'

    // Insert into database within transaction
    const gameId = uuidv4()
    const createdAt = new Date().toISOString()

    const transaction = db.transaction(() => {
      statements.insertGame.run(gameId, gameName, whitePlayer, blackPlayer, 'pgn', createdAt)

      for (const move of validatedMoves) {
        statements.insertMove.run(gameId, move.ply, move.san, move.fen_after)
      }
    })

    transaction()

    return { id: gameId }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import PGN'
    })
  }
})