import { statements, db } from '@/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const gameId = getRouterParam(event, 'id')

    if (!gameId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Game ID is required'
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

    // Delete moves first (due to foreign key constraint)
    const deleteMoves = db.prepare('DELETE FROM moves WHERE game_id = ?')
    deleteMoves.run(gameId)

    // Delete the game
    const deleteGame = db.prepare('DELETE FROM games WHERE id = ?')
    const result = deleteGame.run(gameId)

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    return {
      message: 'Game deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting game:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete game'
    })
  }
})