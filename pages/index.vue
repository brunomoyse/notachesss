<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Chess History</h1>
        <p class="text-gray-600 mt-2">Upload and replay your chess games</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Upload Section -->
        <div class="space-y-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">📸 Upload Handwritten Chess Notes</h2>
            <p class="text-sm text-gray-600 mb-4">
              Take a photo of your handwritten chess notation. The AI will read your handwriting and convert it to a playable game.
            </p>
            <form @submit.prevent="handleImageUpload" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    White Player (optional)
                  </label>
                  <input
                    v-model="imageForm.white"
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Player 1"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Black Player (optional)
                  </label>
                  <input
                    v-model="imageForm.black"
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Player 2"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Select image file (photo of chess notes)
                </label>
                <input
                  ref="imageFileInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  @change="onImageFileChange"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>

              <!-- Image Preview -->
              <div v-if="imagePreview" class="mt-4">
                <p class="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <img
                  :src="imagePreview"
                  alt="Chess notes preview"
                  class="max-w-full h-48 object-contain border border-gray-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                :disabled="!imageFile || imageUploading"
                class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ imageUploading ? 'Processing Image...' : 'Process Handwritten Notes' }}
              </button>
            </form>

            <!-- OCR Results -->
            <div v-if="ocrResults" class="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 class="text-sm font-semibold text-gray-700 mb-4">📝 OCR Results & Manual Editing:</h3>

              <div v-if="ocrResults.error" class="text-red-600 text-xs mb-4">
                ⚠️ {{ ocrResults.error }}
              </div>

              <!-- Format Guide -->
              <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="text-sm font-semibold text-blue-800 mb-2">📋 Expected Format Guide:</h4>
                <div class="text-xs text-blue-700 space-y-1">
                  <div><strong>✅ Good formats:</strong></div>
                  <div class="font-mono bg-white px-2 py-1 rounded border">
                    1. e4 e5<br>
                    2. Nf3 Nc6<br>
                    3. Bb5 a6
                  </div>
                  <div class="mt-2"><strong>🔧 Will be auto-filtered:</strong></div>
                  <div class="text-blue-600">• Dates (20/09/2024)</div>
                  <div class="text-blue-600">• Game types (Rapid, Classic, Blitz)</div>
                  <div class="text-blue-600">• Player names at top</div>
                  <div class="text-blue-600">• Extra words like "Game", "Round", "vs"</div>
                </div>
              </div>

              <!-- Editable OCR Text -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Edit OCR Text (fix any mistakes):
                </label>
                <textarea
                  v-model="editableOcrText"
                  rows="8"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste or edit chess notation here...
Example:
1. e4 e5
2. Nf3 Nc6
3. Bb5 a6"
                ></textarea>
                <div class="mt-2">
                  <p class="text-xs text-gray-500">
                    Edit the text above to fix OCR mistakes. Validation updates automatically as you type.
                  </p>
                  <p v-if="editableOcrText && editableOcrText.trim()" class="text-xs text-green-600 mt-1">
                    ✅ Live validation active - validation updates as you type
                  </p>

                  <!-- Save Game Button -->
                  <div v-if="canSaveGame" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-sm font-medium text-green-800">Ready to Save Game</p>
                        <p class="text-xs text-green-600">No notation errors found. Game can be saved with warnings.</p>
                      </div>
                      <button
                        @click="saveGame"
                        :disabled="savingGame"
                        class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{ savingGame ? 'Saving...' : '💾 Save Game' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t pt-4">
                <p class="text-xs text-gray-600 mb-2">
                  Found {{ ocrResults.rows?.length || 0 }} rows{{ currentIssues?.length ? `, ${currentIssues.length} ${hasActualErrors ? 'notation errors' : (hasWarnings ? 'illegal move warnings' : 'normalizations')}` : '' }}
                  <span v-if="editableOcrText && editableOcrText.trim()" class="text-orange-600 ml-2">(live validation)</span>
                </p>
              </div>

              <!-- Show validation issues if any -->
              <details v-if="currentIssues?.length" class="text-xs mb-2">
                <summary class="cursor-pointer" :class="hasActualErrors ? 'text-red-600' : (hasWarnings ? 'text-yellow-600' : 'text-blue-600')">
                  {{ hasActualErrors ? '❌ Notation Errors' : (hasWarnings ? '⚠️ Illegal Moves' : '✅ Normalizations') }} ({{ currentIssues.length }})
                  <span v-if="editableOcrText && editableOcrText.trim()" class="text-orange-600 ml-1">(live)</span>
                </summary>
                <div class="mt-2 space-y-1">
                  <div :class="hasActualErrors ? 'text-red-600' : (hasWarnings ? 'text-yellow-600' : 'text-blue-600')">
                    {{ hasActualErrors ? 'Notation format errors (need fixing):' : (hasWarnings ? 'Illegal moves (saved as warnings):' : 'Moves normalized during processing:') }}
                  </div>
                  <div class="space-y-1">
                    <div
                      v-for="(issue, index) in currentIssues"
                      :key="index"
                      :class="[
                        'px-2 py-1 border rounded text-xs font-mono',
                        issue.reason === 'normalized'
                          ? 'bg-blue-50 border-blue-200'
                          : issue.reason === 'illegal move (warning)'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-red-50 border-red-200'
                      ]"
                    >
                      <span :class="
                        issue.reason === 'normalized'
                          ? 'text-blue-700'
                          : issue.reason === 'illegal move (warning)'
                            ? 'text-yellow-700'
                            : 'text-red-700'
                      ">
                        Ply {{ issue.ply }}:
                      </span>
                      <span class="font-semibold">"{{ issue.token }}"</span>
                      <span :class="
                        issue.reason === 'normalized'
                          ? 'text-blue-600'
                          : issue.reason === 'illegal move (warning)'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      ">
                        - {{ issue.reason === 'normalized' ? 'normalized to O-O' : issue.reason }}
                      </span>
                    </div>
                  </div>
                </div>
              </details>

              <!-- Show parsed rows -->
              <details v-if="ocrResults.rows?.length" class="text-xs mb-2">
                <summary class="cursor-pointer text-blue-600">View parsed rows ({{ ocrResults.rows.length }})</summary>
                <div class="mt-2 space-y-1">
                  <div class="text-gray-600">Moves extracted from scoresheet:</div>
                  <div class="space-y-1">
                    <div
                      v-for="(row, index) in ocrResults.rows"
                      :key="index"
                      class="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs font-mono"
                    >
                      <span class="text-gray-700">{{ row.n }}.</span>
                      <span class="font-semibold">{{ row.w || '-' }}</span>
                      <span class="font-semibold">{{ row.b || '-' }}</span>
                    </div>
                  </div>
                </div>
              </details>

              <div v-if="ocrResults.metadata" class="text-xs text-gray-600">
                <div class="font-semibold">Extracted metadata:</div>
                <div>Game: {{ ocrResults.metadata.name || 'Not detected' }}</div>
                <div>White: {{ ocrResults.metadata.white || 'Not detected' }}</div>
                <div>Black: {{ ocrResults.metadata.black || 'Not detected' }}</div>
              </div>
            </div>

            <div v-if="imageError" class="mt-4 text-red-600 text-sm">
              {{ imageError }}
            </div>
          </div>

          <!-- PGN Import - Temporarily disabled -->
          <!--
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Import PGN</h2>
            <form @submit.prevent="handlePgnImport" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Game Name (optional)
                </label>
                <input
                  v-model="pgnForm.name"
                  type="text"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter game name"
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    White Player
                  </label>
                  <input
                    v-model="pgnForm.white"
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="White"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Black Player
                  </label>
                  <input
                    v-model="pgnForm.black"
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Black"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  PGN Content
                </label>
                <textarea
                  v-model="pgnForm.pgn"
                  rows="6"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste PGN content here..."
                ></textarea>
              </div>
              <button
                type="submit"
                :disabled="!pgnForm.pgn || pgnUploading"
                class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ pgnUploading ? 'Importing...' : 'Import PGN' }}
              </button>
            </form>
            <div v-if="pgnError" class="mt-4 text-red-600 text-sm">
              {{ pgnError }}
            </div>
          </div>
          -->
        </div>

        <!-- Games List -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Your Games</h2>

          <div v-if="loading" class="text-center py-8 text-gray-500">
            Loading games...
          </div>

          <div v-else-if="games.length === 0" class="text-center py-8 text-gray-500">
            No games uploaded yet
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="game in games"
              :key="game.id"
              class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 group"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1 cursor-pointer" @click="navigateToGame(game.id)">
                  <h3 class="font-medium text-gray-900">{{ game.name }}</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ game.white }} vs {{ game.black }}
                  </p>
                  <p class="text-xs text-gray-400 mt-1">
                    {{ formatDate(game.created_at) }}
                  </p>
                </div>
                <div class="flex space-x-2">
                  <button
                    @click="navigateToGame(game.id)"
                    class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                  >
                    Open
                  </button>
                  <button
                    @click.stop="deleteGame(game.id, game.name)"
                    class="opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg text-sm"
                    title="Delete game"
                  >
                    🗑️
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
import type { Game } from '~/composables/useApi'
import { Chess } from 'chess.js'

const { getGames, importImage, importPgn } = useApi()

// State
const games = ref<Game[]>([])
const loading = ref(true)

// Image Upload (replaces CSV)
const imageFile = ref<File | null>(null)
const imageFileInput = ref<HTMLInputElement>()
const imageUploading = ref(false)
const imageError = ref('')
const imagePreview = ref('')
const ocrResults = ref<any>(null)
const imageForm = ref({
  white: '',
  black: ''
})
const editableOcrText = ref('')
const originalOcrText = ref('')
const savingGame = ref(false)

// Computed to check if text has been edited
const textHasBeenEdited = computed(() => {
  return originalOcrText.value && editableOcrText.value !== originalOcrText.value
})

// Real-time validation of edited text
const liveValidationIssues = computed(() => {
  if (!editableOcrText.value.trim()) return []

  const rows = editableTextToRows(editableOcrText.value)
  const issues: Array<{ply: number, token: string, reason: string}> = []

  try {
    const chess = new Chess()
    let ply = 1

    for (const row of rows.sort((a, b) => a.n - b.n)) {
      // Validate white move
      if (row.w && row.w.trim()) {
        const moveText = row.w.trim()

        // First check if it's valid chess notation format
        const isValidNotation = moveText.match(/^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?(\+|\#)?$/) ||
                               moveText.match(/^(O-O|0-0)(-O|-0)?(\+|\#)?$/)

        if (!isValidNotation) {
          // Invalid notation format - this is a real error
          issues.push({ ply, token: moveText, reason: 'invalid notation' })
          ply++
          continue
        }

        try {
          const move = chess.move(moveText, { strict: false })
          if (!move) {
            // Valid notation but illegal move - just a warning
            issues.push({ ply, token: moveText, reason: 'illegal move (warning)' })
          } else {
            // Check for normalizations
            if (moveText !== move.san && moveText.replace(/0/g, 'O') !== move.san) {
              issues.push({ ply, token: moveText, reason: 'normalized' })
            }
          }
          ply++
        } catch (error) {
          // Valid notation but chess.js couldn't process it - treat as illegal move warning
          issues.push({ ply, token: moveText, reason: 'illegal move (warning)' })
          ply++
        }
      }

      // Validate black move
      if (row.b && row.b.trim()) {
        const moveText = row.b.trim()

        // First check if it's valid chess notation format
        const isValidNotation = moveText.match(/^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?(\+|\#)?$/) ||
                               moveText.match(/^(O-O|0-0)(-O|-0)?(\+|\#)?$/)

        if (!isValidNotation) {
          // Invalid notation format - this is a real error
          issues.push({ ply, token: moveText, reason: 'invalid notation' })
          ply++
          continue
        }

        try {
          const move = chess.move(moveText, { strict: false })
          if (!move) {
            // Valid notation but illegal move - just a warning
            issues.push({ ply, token: moveText, reason: 'illegal move (warning)' })
          } else {
            // Check for normalizations
            if (moveText !== move.san && moveText.replace(/0/g, 'O') !== move.san) {
              issues.push({ ply, token: moveText, reason: 'normalized' })
            }
          }
          ply++
        } catch (error) {
          // Valid notation but chess.js couldn't process it - treat as illegal move warning
          issues.push({ ply, token: moveText, reason: 'illegal move (warning)' })
          ply++
        }
      }
    }

    return issues
  } catch {
    return []
  }
})

// Always use live validation when there's editable text, fall back to OCR results
const currentIssues = computed(() => {
  if (editableOcrText.value && editableOcrText.value.trim()) {
    return liveValidationIssues.value
  }
  return ocrResults.value?.issues || []
})

// Computed to check if there are actual errors vs warnings/normalizations
const hasActualErrors = computed(() => {
  return currentIssues.value?.some((issue: any) =>
    issue.reason !== 'normalized' &&
    issue.reason !== 'illegal move (warning)'
  ) || false
})

// Computed to check if there are any warnings
const hasWarnings = computed(() => {
  return currentIssues.value?.some((issue: any) =>
    issue.reason === 'illegal move (warning)'
  ) || false
})

// Computed to check if game can be saved (no notation errors, warnings are OK)
const canSaveGame = computed(() => {
  if (!ocrResults.value?.rows?.length && !editableOcrText.value?.trim()) return false

  const rows = editableOcrText.value ? editableTextToRows(editableOcrText.value) : (ocrResults.value?.rows || [])
  if (rows.length === 0) return false

  // Can save if there are no actual notation errors (warnings are OK)
  return !hasActualErrors.value
})

// Helper functions for rows format conversion
const rowsToEditableText = (rows: Array<{n: number, w: string, b: string}>) => {
  return rows
    .sort((a, b) => a.n - b.n)
    .map(row => `${row.n}. ${row.w || ''} ${row.b || ''}`)
    .join('\n')
}

const editableTextToRows = (text: string): Array<{n: number, w: string, b: string}> => {
  const rows: Array<{n: number, w: string, b: string}> = []
  const lines = text.split('\n').map(line => line.trim()).filter(line => line)

  for (const line of lines) {
    // Match pattern: "1. e4 c6" or "1 e4 c6"
    const match = line.match(/^(\d+)\.?\s+(\S*)\s*(\S*)/)
    if (match) {
      const n = parseInt(match[1])
      const w = match[2] ?? ''
      const b = match[3] ?? ''

      if (n >= 1 && n <= 40) {
        rows.push({ n, w, b })
      }
    }
  }

  return rows
}

// PGN Import
const pgnForm = ref({
  name: '',
  white: '',
  black: '',
  pgn: ''
})
const pgnUploading = ref(false)
const pgnError = ref('')

// Methods
const loadGames = async () => {
  try {
    loading.value = true
    const response = await getGames()
    games.value = response.games
  } catch (error) {
    console.error('Failed to load games:', error)
  } finally {
    loading.value = false
  }
}

const onImageFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    imageFile.value = file
    imageError.value = ''
    ocrResults.value = null

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const handleImageUpload = async () => {
  if (!imageFile.value) return

  try {
    imageUploading.value = true
    imageError.value = ''

    const result = await importImage(imageFile.value)
    ocrResults.value = result

    // Populate editable text area with formatted rows
    const formattedText = result.rows ? rowsToEditableText(result.rows) : ''
    editableOcrText.value = formattedText
    originalOcrText.value = formattedText

    // Reset form
    imageFile.value = null
    imagePreview.value = ''
    if (imageFileInput.value) {
      imageFileInput.value.value = ''
    }

    // Only reload games if processing was successful (has id)
    if (result.id) {
      await loadGames()
    }
  } catch (error: any) {
    imageError.value = error.data?.message || 'Failed to process handwritten notes'
  } finally {
    imageUploading.value = false
  }
}

const handlePgnImport = async () => {
  if (!pgnForm.value.pgn) return

  try {
    pgnUploading.value = true
    pgnError.value = ''

    await importPgn(
      pgnForm.value.pgn,
      pgnForm.value.name || undefined,
      pgnForm.value.white || undefined,
      pgnForm.value.black || undefined
    )

    // Reset form
    pgnForm.value = {
      name: '',
      white: '',
      black: '',
      pgn: ''
    }

    // Reload games
    await loadGames()
  } catch (error: any) {
    pgnError.value = error.data?.message || 'Failed to import PGN'
  } finally {
    pgnUploading.value = false
  }
}

const navigateToGame = (gameId: string) => {
  navigateTo(`/game/${gameId}`)
}

const deleteGame = async (gameId: string, gameName: string) => {
  if (!confirm(`Are you sure you want to delete "${gameName}"? This action cannot be undone.`)) {
    return
  }

  try {
    const { deleteGame } = useApi()
    await deleteGame(gameId)

    // Reload games list
    await loadGames()
  } catch (error: any) {
    console.error('Error deleting game:', error)
    alert('Failed to delete game. Please try again.')
  }
}

const saveGame = async () => {
  if (!canSaveGame.value) return

  try {
    savingGame.value = true
    imageError.value = ''

    // Get the current rows (either from edited text or OCR results)
    const rows = editableOcrText.value ? editableTextToRows(editableOcrText.value) : (ocrResults.value?.rows || [])

    const result = await $fetch('/api/games/save-manual', {
      method: 'POST',
      body: {
        rows,
        name: `Game ${new Date().toLocaleDateString()}`,
        white: imageForm.value.white || 'Player 1',
        black: imageForm.value.black || 'Player 2'
      }
    })

    // Success! Clear the form and reload games
    ocrResults.value = null
    editableOcrText.value = ''
    originalOcrText.value = ''
    imagePreview.value = ''

    await loadGames()

    // Show success message
    alert(`Game saved successfully! You can now view it in "Your Games".`)

  } catch (error: any) {
    imageError.value = error.data?.message || 'Failed to save game'
  } finally {
    savingGame.value = false
  }
}


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

// Load games on mount
onMounted(() => {
  loadGames()
})
</script>