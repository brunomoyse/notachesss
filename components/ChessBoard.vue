<template>
  <div class="chessboard-container">
    <div class="flex flex-col items-center gap-3">
      <button
        @click="flipBoard"
        class="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg p-2 shadow-sm transition-colors flex items-center gap-2"
        title="Flip board"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
        <span class="text-sm">Flip Board</span>
      </button>
      <div ref="boardEl" class="chessboard" :style="{ width: '400px', height: '400px' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'

interface Props {
  fen: string
}

const props = defineProps<Props>()

const boardEl = ref<HTMLElement>()
let board: Api | null = null
const isFlipped = ref(false)

// Touch handling for swipe gestures
let touchStartX = 0
let touchStartY = 0

onMounted(() => {
  if (boardEl.value) {
    board = Chessground(boardEl.value, {
      fen: props.fen,
      viewOnly: true,
      coordinates: true,
      resizable: true,
      orientation: 'white',
      drawable: {
        enabled: false
      },
      movable: {
        free: false,
        color: undefined
      },
      premovable: {
        enabled: false
      }
    })

    // Add touch event listeners for swipe gestures
    boardEl.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    boardEl.value.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
})

watch(() => props.fen, (newFen) => {
  if (board) {
    board.set({
      fen: newFen,
      lastMove: undefined
    })
  }
})

// Board flip functionality
const flipBoard = () => {
  isFlipped.value = !isFlipped.value
  if (board) {
    board.set({
      orientation: isFlipped.value ? 'black' : 'white'
    })
  }
}

// Touch event handlers for swipe gestures
const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!e.changedTouches[0]) return

  const touch = e.changedTouches[0]
  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY

  // Check if it's a horizontal swipe (more horizontal than vertical movement)
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    // Swipe detected - flip the board
    flipBoard()
  }
}

onUnmounted(() => {
  if (board) {
    board.destroy()
  }

  // Clean up touch event listeners
  if (boardEl.value) {
    boardEl.value.removeEventListener('touchstart', handleTouchStart)
    boardEl.value.removeEventListener('touchend', handleTouchEnd)
  }
})
</script>

<style scoped>
.chessboard-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.chessboard {
  border: 2px solid #8b4513;
  border-radius: 4px;
}
</style>