export interface Game {
  id: string
  name: string
  white: string
  black: string
  created_at: string
}

export interface Move {
  ply: number
  san: string
  fen_after: string
}

export interface GameDetail {
  id: string
  name: string
  white: string
  black: string
  source: string
  created_at: string
}

export interface GameWithMoves {
  game: GameDetail
  moves: Move[]
}

export const useApi = () => {
  const getGames = async (): Promise<{ games: Game[] }> => {
    return $fetch<{ games: Game[] }>('/api/games')
  }

  const getGame = async (id: string): Promise<GameWithMoves> => {
    return $fetch<GameWithMoves>(`/api/games/${id}`)
  }

  const importCsv = async (file: File): Promise<{ id: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    return $fetch<{ id: string }>('/api/games/import-csv', {
      method: 'POST',
      body: formData
    })
  }

  const importPgn = async (pgn: string, name?: string, white?: string, black?: string): Promise<{ id: string }> => {
    return $fetch<{ id: string }>('/api/games/import-pgn', {
      method: 'POST',
      body: {pgn, name, white, black}
    });
  }

  const importImage = async (file: File): Promise<{ id: string; rows: Array<{n: number, w: string, b: string}>; issues: Array<{ply: number, token: string, reason: string}>; metadata: any }> => {
    const formData = new FormData()
    formData.append('file', file)

    const res:any = await $fetch('/api/ocr-chess', { method: 'POST', body: formData })
    return res.data
  }

  const saveManualGame = async (rows: Array<{n: number, w: string, b: string}>, name?: string, white?: string, black?: string): Promise<{ id: string; message: string }> => {
    return $fetch<{ id: string; message: string }>('/api/games/save-manual', {
      method: 'POST',
      body: { rows, name, white, black }
    })
  }

  const updateMove = async (gameId: string, ply: number, newSan: string): Promise<{ message: string }> => {
    return $fetch<{ message: string }>(`/api/games/${gameId}/moves/${ply}`, {
      method: 'PUT',
      body: { san: newSan }
    })
  }

  const insertMove = async (gameId: string, afterPly: number, san: string): Promise<{ message: string }> => {
    return $fetch<{ message: string }>(`/api/games/${gameId}/moves/insert`, {
      method: 'POST',
      body: { afterPly, san }
    })
  }

  const deleteGame = async (gameId: string): Promise<{ message: string }> => {
    return $fetch<{ message: string }>(`/api/games/${gameId}`, {
      method: 'DELETE'
    })
  }

  return {
    getGames,
    getGame,
    importCsv,
    importPgn,
    importImage,
    saveManualGame,
    updateMove,
    insertMove,
    deleteGame,
  }
}