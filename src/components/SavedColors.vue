<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/controllersApi'
import type { LedState, Preset } from '@/types'

const props = defineProps<{
  controllerId: string
  currentState: LedState
  presets: Preset[]
}>()

const emit = defineEmits<{
  changed: []
  apply: [state: LedState]
}>()

const editing = ref(false)
const editList = ref<Preset[]>([])

let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressTriggered = false
let touchStart: { x: number; y: number } | null = null
const touchMoveThreshold = 8

// --- Drag state ---
let dragIndex: number | null = null

function startPress(event?: MouseEvent | TouchEvent) {
  longPressTriggered = false
  if (longPressTimer) clearTimeout(longPressTimer)

  if (event && 'touches' in event) {
    const touch = event.touches[0]
    if (touch) {
      touchStart = { x: touch.clientX, y: touch.clientY }
    }
  } else {
    touchStart = null
  }

  longPressTimer = setTimeout(() => {
    longPressTimer = null
    longPressTriggered = true
    enterEditMode()
  }, 600)
}

function handleTouchMove(event: TouchEvent) {
  if (!touchStart) return
  const touch = event.touches[0]
  if (!touch) return

  const dx = touch.clientX - touchStart.x
  const dy = touch.clientY - touchStart.y
  if (dx * dx + dy * dy > touchMoveThreshold * touchMoveThreshold) {
    cancelPress()
  }
}

function cancelPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  touchStart = null
}

function handleClick(preset: Preset) {
  cancelPress()
  if (longPressTriggered) {
    longPressTriggered = false
    return
  }
  if (!editing.value) {
    apply(preset)
  }
}

function enterEditMode() {
  editList.value = [...props.presets]
  editing.value = true
}

async function saveOrder() {
  const order = editList.value.map((p) => p.id)
  await api.reorderPresets(props.controllerId, order)
  editing.value = false
  emit('changed')
}

function cancelEdit() {
  editing.value = false
}

async function removeInEdit(preset: Preset) {
  if (!confirm(`Delete this color "${preset.name}"?`)) return
  await api.deletePreset(props.controllerId, preset.id)
  editList.value = editList.value.filter((p) => p.id !== preset.id)
  emit('changed')
}

// --- Drag handlers ---
function onDragStart(index: number, event: DragEvent) {
  dragIndex = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (dragIndex !== null && dragIndex !== index) {
    const [item] = editList.value.splice(dragIndex, 1)
    if (item) editList.value.splice(index, 0, item)
    dragIndex = index
  }
}

function onDrop() {
  dragIndex = null
}

function onDragEnd() {
  dragIndex = null
}

// --- Touch drag handlers ---
let touchDragIndex: number | null = null
let touchClone: HTMLElement | null = null
let touchStartY = 0
let rowHeight = 0

function onTouchDragStart(index: number, event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  touchDragIndex = index
  touchStartY = touch.clientY

  const row = (event.target as HTMLElement).closest('.preset-row') as HTMLElement
  if (!row) return
  rowHeight = row.offsetHeight + 8 // include margin

  touchClone = row.cloneNode(true) as HTMLElement
  touchClone.style.position = 'fixed'
  touchClone.style.left = row.getBoundingClientRect().left + 'px'
  touchClone.style.top = touch.clientY - row.offsetHeight / 2 + 'px'
  touchClone.style.width = row.offsetWidth + 'px'
  touchClone.style.opacity = '0.8'
  touchClone.style.zIndex = '1000'
  touchClone.style.pointerEvents = 'none'
  document.body.appendChild(touchClone)

  row.style.opacity = '0.3'
}

function onTouchDragMove(event: TouchEvent) {
  if (touchDragIndex === null || !touchClone) return
  event.preventDefault()

  const touch = event.touches[0]
  if (!touch) return
  touchClone.style.top = touch.clientY - touchClone.offsetHeight / 2 + 'px'

  const delta = touch.clientY - touchStartY
  const indexShift = Math.round(delta / rowHeight)
  const newIndex = Math.max(0, Math.min(editList.value.length - 1, touchDragIndex + indexShift))

  if (newIndex !== touchDragIndex) {
    const [item] = editList.value.splice(touchDragIndex, 1)
    if (item) editList.value.splice(newIndex, 0, item)
    touchStartY += (newIndex - touchDragIndex) * rowHeight
    touchDragIndex = newIndex
  }
}

function onTouchDragEnd(event: TouchEvent) {
  if (touchClone) {
    touchClone.remove()
    touchClone = null
  }

  // Reset opacity on all rows
  const rows = (event.target as HTMLElement)?.closest('.presets')?.querySelectorAll('.preset-row')
  rows?.forEach((r) => ((r as HTMLElement).style.opacity = ''))

  touchDragIndex = null
}

async function save() {
  const name = prompt('Preset name')
  if (!name) return

  await api.savePreset(props.controllerId, {
    name,
    state: {
      on: props.currentState.on,
      r: props.currentState.r,
      g: props.currentState.g,
      b: props.currentState.b,
      w: props.currentState.w,
      br: props.currentState.br,
    },
  })

  emit('changed')
}

function apply(preset: Preset) {
  emit('apply', preset.state)
}
</script>

<template>
  <section class="presets">
    <div class="header-row">
      <h3>Saved Colors</h3>
      <div v-if="editing" class="edit-actions">
        <button class="edit-btn cancel" @click="cancelEdit">Cancel</button>
        <button class="edit-btn confirm" @click="saveOrder">Save</button>
      </div>
    </div>
    <p class="hint">{{ editing ? 'Drag to reorder' : 'Tap to apply, long press to edit' }}</p>

    <!-- Normal mode -->
    <template v-if="!editing">
      <div
        v-for="preset in presets"
        :key="preset.id"
        class="preset-row interactive"
        @mousedown="startPress($event)"
        @touchstart.prevent="startPress($event)"
        @mouseleave="cancelPress"
        @touchmove="handleTouchMove"
        @touchend.prevent="handleClick(preset)"
        @touchcancel="cancelPress"
        @click="handleClick(preset)"
        @contextmenu.prevent
      >
        <span
          class="preview"
          :style="{ background: `rgb(${preset.state.r},${preset.state.g},${preset.state.b})` }"
        />
        <div class="label">
          <span class="name">{{ preset.name }}</span>
          <div class="meta-row">
            <span class="chip chip-r">R {{ preset.state.r }}</span>
            <span class="chip chip-g">G {{ preset.state.g }}</span>
            <span class="chip chip-b">B {{ preset.state.b }}</span>
            <span class="chip chip-w">W {{ preset.state.w }}</span>
            <span class="chip chip-br">Br {{ Math.round(preset.state.br * 100) }}%</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit mode -->
    <template v-else>
      <div
        v-for="(preset, index) in editList"
        :key="preset.id"
        class="preset-row edit-row"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @drop="onDrop()"
        @dragend="onDragEnd"
      >
        <span
          class="drag-handle"
          @touchstart="onTouchDragStart(index, $event)"
          @touchmove="onTouchDragMove($event)"
          @touchend="onTouchDragEnd($event)"
          >⠿</span
        >
        <span
          class="preview"
          :style="{ background: `rgb(${preset.state.r},${preset.state.g},${preset.state.b})` }"
        />
        <div class="label">
          <span class="name">{{ preset.name }}</span>
          <div class="meta-row">
            <span class="chip chip-r">R {{ preset.state.r }}</span>
            <span class="chip chip-g">G {{ preset.state.g }}</span>
            <span class="chip chip-b">B {{ preset.state.b }}</span>
            <span class="chip chip-w">W {{ preset.state.w }}</span>
            <span class="chip chip-br">Br {{ Math.round(preset.state.br * 100) }}%</span>
          </div>
        </div>
        <button class="delete-btn" @click="removeInEdit(preset)">✕</button>
      </div>
    </template>

    <div class="save-action">
      <button class="save-btn" @click="save">Save Current Color</button>
    </div>
  </section>
</template>

<style scoped>
.presets {
  border-radius: 20px;
  padding: 1.25rem;
  background: var(--surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.edit-btn.cancel {
  background: var(--surface-3);
  color: rgba(255, 255, 255, 0.7);
}

.edit-btn.confirm {
  background: rgba(50, 180, 50, 0.3);
  color: #4f4;
}

.hint {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.save-action {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.save-btn {
  width: 100%;
  background: var(--surface-3);
}

.save-btn:active {
  background: var(--surface-2);
}

.preset-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 16px;
  background: var(--surface-2);
  margin-bottom: 0.5rem;
}

.preset-row.interactive {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition:
    background 0.2s,
    transform 0.1s;
}

.preset-row.interactive:active {
  background: var(--surface-3);
  transform: scale(0.98);
}

.preset-row.edit-row {
  grid-template-columns: auto auto 1fr auto;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  animation: wiggle 0.3s ease-in-out infinite alternate;
}

.preset-row.edit-row:nth-child(odd) {
  animation-delay: -0.15s;
}

.preset-row.edit-row:active {
  cursor: grabbing;
  animation: none;
}

@keyframes wiggle {
  0% {
    transform: rotate(-0.4deg);
  }
  100% {
    transform: rotate(0.4deg);
  }
}

.drag-handle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.4);
  cursor: grab;
  touch-action: none;
  padding: 0 0.25rem;
}

.drag-handle:active {
  cursor: grabbing;
}

.delete-btn {
  background: rgba(255, 60, 60, 0.2);
  color: #f66;
  border: none;
  border-radius: 10px;
  width: 36px;
  height: 36px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.delete-btn:active {
  background: rgba(255, 60, 60, 0.4);
}

.preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.label {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.2rem;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  font-size: 0.95rem;
}

.chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-3);
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.02em;
}

.chip-r {
  background: rgba(255, 70, 70, 0.15);
  border-color: rgba(255, 70, 70, 0.3);
  color: #ff8a8a;
}

.chip-g {
  background: rgba(70, 220, 120, 0.15);
  border-color: rgba(70, 220, 120, 0.3);
  color: #9fffc3;
}

.chip-b {
  background: rgba(80, 140, 255, 0.15);
  border-color: rgba(80, 140, 255, 0.3);
  color: #9db8ff;
}

.chip-w {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.85);
}

.chip-br {
  background: rgba(255, 200, 120, 0.15);
  border-color: rgba(255, 200, 120, 0.3);
  color: #ffd8a0;
}
</style>
