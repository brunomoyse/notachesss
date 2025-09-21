import { statements } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const games = statements.getGames.all()
    return { games }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch games'
    })
  }
})