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

// --- Drag state ---
let dragIndex: number | null = null

function startPress() {
  longPressTriggered = false
  if (longPressTimer) clearTimeout(longPressTimer)

  longPressTimer = setTimeout(() => {
    longPressTimer = null
    longPressTriggered = true
    enterEditMode()
  }, 600)
}

function cancelPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
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
        @mousedown="startPress()"
        @touchstart.prevent="startPress()"
        @mouseleave="cancelPress"
        @touchmove="cancelPress"
        @touchcancel="cancelPress"
        @click="handleClick(preset)"
        @contextmenu.prevent
      >
        <span
          class="preview"
          :style="{ background: `rgb(${preset.state.r},${preset.state.g},${preset.state.b})` }"
        />
        <span class="name">{{ preset.name }}</span>
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
        <span class="name">{{ preset.name }}</span>
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

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  font-size: 0.95rem;
}
</style>
