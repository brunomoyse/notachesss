<template>
  <div class="chessboard-container">
    <div ref="boardEl" class="chessboard" :style="{ width: '400px', height: '400px' }"></div>
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

onMounted(() => {
  if (boardEl.value) {
    board = Chessground(boardEl.value, {
      fen: props.fen,
      viewOnly: true,
      coordinates: true,
      resizable: true,
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

onUnmounted(() => {
  if (board) {
    board.destroy()
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