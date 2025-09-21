<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-6">
        <button
          @click="navigateTo('/')"
          class="text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Back to Games
        </button>
      </div>

      <div v-if="loading" class="text-center py-8">
        <div class="text-gray-500">Loading game...</div>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <div class="text-red-600">{{ error }}</div>
      </div>

      <div v-else-if="game" class="space-y-6">
        <!-- Game Header -->
        <div class="bg-white rounded-lg shadow p-6">
          <h1 class="text-2xl font-bold text-gray-900">{{ game.name }}</h1>
          <div class="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
            <span><strong>White:</strong> {{ game.white }}</span>
            <span><strong>Black:</strong> {{ game.black }}</span>
            <span><strong>Date:</strong> {{ formatDate(game.created_at) }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Chess Board -->
          <div class="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div class="flex justify-center mb-4">
              <ChessBoard :fen="currentFen" />
            </div>

            <!-- Controls -->
            <div class="flex justify-center space-x-2 mb-4">
              <button
                @click="goToStart"
                class="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm"
                title="Go to start"
              >
                |&lt;&lt;
              </button>
              <button
                @click="previousMove"
                :disabled="currentPly === 0"
                class="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 px-3 py-2 rounded text-sm"
                title="Previous move"
              >
                &lt;&lt;
              </button>
              <button
                @click="togglePlay"
                :disabled="moves.length === 0"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                {{ isPlaying ? 'Pause' : 'Play' }}
              </button>
              <button
                @click="nextMove"
                :disabled="currentPly >= moves.length"
                class="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 px-3 py-2 rounded text-sm"
                title="Next move"
              >
                &gt;&gt;
              </button>
              <button
                @click="goToEnd"
                class="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm"
                title="Go to end"
              >
                &gt;&gt;|
              </button>
            </div>

            <!-- Position Slider -->
            <div class="mb-4">
              <input
                v-model="currentPly"
                type="range"
                :min="0"
                :max="moves.length"
                class="w-full"
                @input="onSliderChange"
              />
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>Start</span>
                <span>Move {{ currentPly }} / {{ moves.length }}</span>
                <span>End</span>
              </div>
            </div>
          </div>

          <!-- Move List -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">Moves</h3>
              <button
                @click="toggleEditMode"
                :class="[
                  'px-3 py-1 rounded text-sm',
                  editMode ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                ]"
              >
                {{ editMode ? 'Done' : 'Edit' }}
              </button>
            </div>
            <div class="max-h-96 overflow-y-auto">
              <div v-if="moves.length === 0" class="text-gray-500 text-sm">
                No moves recorded
              </div>
              <div v-else class="space-y-1">
                <!-- Add move input form -->
                <div v-if="addingMoveAfter !== null" class="bg-blue-50 p-3 rounded border mb-3">
                  <div class="text-sm text-gray-700 mb-2">
                    <strong>Adding move {{ addingMoveAfter === 0 ? 'at beginning' : `after move ${Math.ceil(addingMoveAfter / 2)}` }}</strong>
                  </div>
                  <input
                    v-model="newMoveText"
                    @keyup.enter="saveNewMove"
                    @keyup.escape="cancelAddMove"
                    placeholder="Enter move (e.g. e4, Nf3, O-O)"
                    class="w-full px-3 py-2 border rounded"
                    ref="new-move-input"
                  />
                  <div class="mt-2 flex space-x-2">
                    <button
                      @click="saveNewMove"
                      class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Move
                    </button>
                    <button
                      @click="cancelAddMove"
                      class="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div
                  v-for="(move, index) in groupedMoves"
                  :key="index"
                  :class="[
                    'text-sm group relative',
                    editMode ? 'hover:bg-gray-50 rounded px-1' : ''
                  ]"
                >
                  <!-- Hover add button on the left -->
                  <button
                    v-if="editMode && addingMoveAfter === null"
                    @click="addMoveAfter(index === 0 ? 0 : (move.black?.ply || move.white?.ply || 0) - 2)"
                    class="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                    :title="index === 0 ? 'Add move before this' : `Add move before move ${index + 1}`"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                  </button>

                  <span class="text-gray-600 font-mono w-8 inline-block">{{ index + 1 }}.</span>

                  <!-- White move -->
                  <span v-if="move.white" class="inline-block w-20 ml-1">
                    <span
                      v-if="!editMode || editingMove?.ply !== move.white.ply"
                      :class="[
                        'cursor-pointer hover:bg-blue-100 px-1 rounded relative',
                        currentPly === move.white.ply ? 'bg-blue-200 font-semibold' : '',
                        illegalMoves.has(move.white.ply) ? 'bg-yellow-200 hover:bg-yellow-300' : ''
                      ]"
                      @click="!editMode ? goToPly(move.white.ply) : startEditingMove(move.white)"
                      :title="illegalMoves.has(move.white.ply) ? 'Illegal move - click to edit' : ''"
                    >
                      {{ move.white.san }}
                      <span v-if="illegalMoves.has(move.white.ply)" class="text-yellow-600 text-xs">⚠</span>
                    </span>
                    <input
                      v-else
                      v-model="editMoveText"
                      @keyup.enter="saveEditedMove"
                      @keyup.escape="cancelEdit"
                      class="w-full px-1 border rounded text-xs"
                      :ref="'edit-input-' + move.white.ply"
                    />
                  </span>

                  <!-- Black move -->
                  <span v-if="move.black" class="inline-block w-20 ml-2">
                    <span
                      v-if="!editMode || editingMove?.ply !== move.black.ply"
                      :class="[
                        'cursor-pointer hover:bg-blue-100 px-1 rounded relative',
                        currentPly === move.black.ply ? 'bg-blue-200 font-semibold' : '',
                        illegalMoves.has(move.black.ply) ? 'bg-yellow-200 hover:bg-yellow-300' : ''
                      ]"
                      @click="!editMode ? goToPly(move.black.ply) : startEditingMove(move.black)"
                      :title="illegalMoves.has(move.black.ply) ? 'Illegal move - click to edit' : ''"
                    >
                      {{ move.black.san }}
                      <span v-if="illegalMoves.has(move.black.ply)" class="text-yellow-600 text-xs">⚠</span>
                    </span>
                    <input
                      v-else
                      v-model="editMoveText"
                      @keyup.enter="saveEditedMove"
                      @keyup.escape="cancelAddMove"
                      class="w-full px-1 border rounded text-xs"
                      :ref="'edit-input-' + move.black.ply"
                    />
                  </span>

                  <!-- Hover add button on the right -->
                  <button
                    v-if="editMode && addingMoveAfter === null"
                    @click="addMoveAfter(move.black?.ply || move.white?.ply || 0)"
                    class="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                    :title="`Add move after move ${index + 1}`"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>

                <!-- Add button at the end -->
                <div v-if="editMode && addingMoveAfter === null && moves.length > 0" class="text-center pt-2">
                  <button
                    @click="addMoveAfter(moves[moves.length - 1]?.ply || 0)"
                    class="text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                    title="Add move at end"
                  >
                    + Add move at end
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameWithMoves, Move } from '~/composables/useApi'

const route = useRoute()
const { getGame } = useApi()

// State
const game = ref<GameWithMoves['game'] | null>(null)
const moves = ref<Move[]>([])
const loading = ref(true)
const error = ref('')

const currentPly = ref(0)
const isPlaying = ref(false)
const editMode = ref(false)
const editingMove = ref<{ ply: number; san: string } | null>(null)
const editMoveText = ref('')
const addingMoveAfter = ref<number | null>(null)
const newMoveText = ref('')
let playInterval: NodeJS.Timeout | null = null

// Computed
const currentFen = computed(() => {
  if (currentPly.value === 0) {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Starting position
  }
  const move = moves.value[currentPly.value - 1]
  return move ? move.fen_after : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
})

const illegalMoves = computed(() => {
  const illegal = new Set<number>()

  if (moves.value.length === 0) return illegal

  // Check each move by comparing FEN positions
  let previousFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  for (const move of moves.value) {
    if (move.fen_after === previousFen) {
      // FEN didn't change, so this was an illegal move
      illegal.add(move.ply)
    } else {
      previousFen = move.fen_after
    }
  }

  return illegal
})

const groupedMoves = computed(() => {
  const grouped: Array<{ white?: Move; black?: Move }> = []

  for (let i = 0; i < moves.value.length; i += 2) {
    const whiteMove = moves.value[i]
    const blackMove = moves.value[i + 1]

    grouped.push({
      white: whiteMove,
      black: blackMove
    })
  }

  return grouped
})

// Methods
const loadGame = async () => {
  try {
    loading.value = true
    error.value = ''

    const gameId = route.params.id as string
    const response = await getGame(gameId)

    game.value = response.game
    moves.value = response.moves
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to load game'
  } finally {
    loading.value = false
  }
}

const goToStart = () => {
  currentPly.value = 0
  stopPlaying()
}

const goToEnd = () => {
  currentPly.value = moves.value.length
  stopPlaying()
}

const previousMove = () => {
  if (currentPly.value > 0) {
    currentPly.value--
  }
  stopPlaying()
}

const nextMove = () => {
  if (currentPly.value < moves.value.length) {
    currentPly.value++
  }
  if (currentPly.value >= moves.value.length) {
    stopPlaying()
  }
}

const goToPly = (ply: number) => {
  currentPly.value = ply
  stopPlaying()
}

const onSliderChange = () => {
  stopPlaying()
}

const togglePlay = () => {
  if (isPlaying.value) {
    stopPlaying()
  } else {
    startPlaying()
  }
}

const startPlaying = () => {
  if (currentPly.value >= moves.value.length) {
    currentPly.value = 0
  }

  isPlaying.value = true
  playInterval = setInterval(() => {
    nextMove()
  }, 600)
}

const stopPlaying = () => {
  isPlaying.value = false
  if (playInterval) {
    clearInterval(playInterval)
    playInterval = null
  }
}

const toggleEditMode = async () => {
  if (editMode.value && editingMove.value) {
    // Save any pending edit before exiting edit mode
    await saveEditedMove()
  }

  if (editMode.value) {
    // Exiting edit mode - cancel any remaining edits
    cancelEdit()
  }

  editMode.value = !editMode.value
}

const startEditingMove = (move: Move) => {
  editingMove.value = { ply: move.ply, san: move.san }
  editMoveText.value = move.san
  stopPlaying()

  // Focus the input after Vue updates the DOM
  nextTick(() => {
    const input = document.querySelector(`[ref="edit-input-${move.ply}"]`) as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const cancelEdit = () => {
  editingMove.value = null
  editMoveText.value = ''
}

const saveEditedMove = async () => {
  if (!editingMove.value || !editMoveText.value.trim()) return

  try {
    const { updateMove } = useApi()
    await updateMove(game.value!.id, editingMove.value.ply, editMoveText.value.trim())

    // Reload the game to get updated moves
    await loadGame()

    cancelEdit()
  } catch (error: any) {
    console.error('Failed to update move:', error)
    // Show error to user (you could add a toast notification here)
  }
}

const addMoveAfter = (afterPly: number) => {
  addingMoveAfter.value = afterPly
  newMoveText.value = ''

  // Cancel any existing edit
  if (editingMove.value) {
    cancelEdit()
  }

  stopPlaying()

  // Focus the input after Vue updates the DOM
  nextTick(() => {
    const input = document.querySelector('input[ref="new-move-input"]') as HTMLInputElement
    if (input) {
      input.focus()
    }
  })
}

const saveNewMove = async () => {
  if (addingMoveAfter.value === null || !newMoveText.value.trim()) return

  try {
    const { insertMove } = useApi()
    await insertMove(game.value!.id, addingMoveAfter.value, newMoveText.value.trim())

    // Reload the game to get updated moves
    await loadGame()

    cancelAddMove()
  } catch (error: any) {
    console.error('Failed to insert move:', error)
    // Show error to user (you could add a toast notification here)
  }
}

const cancelAddMove = () => {
  addingMoveAfter.value = null
  newMoveText.value = ''
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

// Lifecycle
onMounted(() => {
  loadGame()
})

onUnmounted(() => {
  stopPlaying()
})

// Watch for route changes
watch(() => route.params.id, () => {
  if (route.params.id) {
    loadGame()
  }
})
</script>