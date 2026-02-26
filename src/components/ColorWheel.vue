<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  r: number
  g: number
  b: number
}>()

const emit = defineEmits<{
  change: [value: { r: number; g: number; b: number }]
}>()

const wheelRef = ref<HTMLElement | null>(null)
const thumbX = ref(0)
const thumbY = ref(0)
const isDragging = ref(false)

const SNAP_TO_EDGE_THRESHOLD = 0.92
const PRIMARY_HUE_SNAP_DEGREES = 10

const thumbStyle = computed(() => ({
  left: `${thumbX.value}px`,
  top: `${thumbY.value}px`,
}))

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function snapHueAtEdge(hue: number) {
  const primaryHues = [0, 120, 240]
  let bestHue = hue
  let bestDistance = 360

  for (const primaryHue of primaryHues) {
    const wrappedDiff = Math.abs(((((hue - primaryHue) % 360) + 540) % 360) - 180)
    if (wrappedDiff < bestDistance) {
      bestDistance = wrappedDiff
      bestHue = primaryHue
    }
  }

  return bestDistance <= PRIMARY_HUE_SNAP_DEGREES ? bestHue : hue
}

function hsvToRgb(hue: number, saturation: number, value: number) {
  const hueSector = hue / 60
  const chroma = value * saturation
  const x = chroma * (1 - Math.abs((hueSector % 2) - 1))

  let red = 0
  let green = 0
  let blue = 0

  if (hueSector >= 0 && hueSector < 1) {
    red = chroma
    green = x
  } else if (hueSector < 2) {
    red = x
    green = chroma
  } else if (hueSector < 3) {
    green = chroma
    blue = x
  } else if (hueSector < 4) {
    green = x
    blue = chroma
  } else if (hueSector < 5) {
    red = x
    blue = chroma
  } else {
    red = chroma
    blue = x
  }

  const match = value - chroma

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  }
}

function rgbToHsv(red: number, green: number, blue: number) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6
    } else if (max === g) {
      hue = (b - r) / delta + 2
    } else {
      hue = (r - g) / delta + 4
    }
  }

  hue = Math.round(hue * 60)
  if (hue < 0) hue += 360

  const saturation = max === 0 ? 0 : delta / max

  return {
    h: hue,
    s: saturation,
    v: max,
  }
}

function updateThumbFromRgb(red: number, green: number, blue: number) {
  if (!wheelRef.value || isDragging.value) return

  const hsv = rgbToHsv(red, green, blue)
  const radius = wheelRef.value.clientWidth / 2
  const angle = ((hsv.h - 90) * Math.PI) / 180
  const distance = hsv.s * radius

  thumbX.value = radius + Math.cos(angle) * distance
  thumbY.value = radius + Math.sin(angle) * distance
}

function applyPoint(clientX: number, clientY: number) {
  if (!wheelRef.value) return

  const rect = wheelRef.value.getBoundingClientRect()
  const radius = rect.width / 2
  const centerX = rect.left + radius
  const centerY = rect.top + radius

  const deltaX = clientX - centerX
  const deltaY = clientY - centerY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  const constrainedDistance = Math.min(distance, radius)
  let saturation = clamp(constrainedDistance / radius, 0, 1)

  if (saturation >= SNAP_TO_EDGE_THRESHOLD) {
    saturation = 1
  }

  const angle = Math.atan2(deltaY, deltaX)
  let hue = ((angle * 180) / Math.PI + 450) % 360

  if (saturation === 1) {
    hue = snapHueAtEdge(hue)
  }

  const finalDistance = saturation * radius
  thumbX.value = radius + Math.cos(angle) * finalDistance
  thumbY.value = radius + Math.sin(angle) * finalDistance

  emit('change', hsvToRgb(hue, saturation, 1))
}

function onPointerDown(event: PointerEvent) {
  isDragging.value = true
  wheelRef.value?.setPointerCapture(event.pointerId)
  applyPoint(event.clientX, event.clientY)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  applyPoint(event.clientX, event.clientY)
}

function onPointerUp(event: PointerEvent) {
  isDragging.value = false
  wheelRef.value?.releasePointerCapture(event.pointerId)
}

watch(
  () => [props.r, props.g, props.b],
  () => {
    updateThumbFromRgb(props.r, props.g, props.b)
  },
  { immediate: true },
)

onMounted(() => {
  updateThumbFromRgb(props.r, props.g, props.b)
})

onBeforeUnmount(() => {
  isDragging.value = false
})
</script>

<template>
  <div
    ref="wheelRef"
    class="wheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="thumb" :style="thumbStyle" />
  </div>
</template>

<style scoped>
.wheel {
  position: relative;
  width: min(320px, 78vw);
  max-width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  touch-action: none;
  box-shadow:
    0 0 0 4px var(--surface-2),
    0 8px 24px rgba(0, 0, 0, 0.5);
}

.wheel::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, rgba(255, 255, 255, 0) 74%);
}

.thumb {
  position: absolute;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 4px solid #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 1;
  background: transparent;
}
</style>
