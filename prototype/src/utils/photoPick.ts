import type { Photo } from '../types'

const TARGET = 3

export function pickThreePhotos(photos: Photo[], reshuffleStep = 0): Photo[] {
  if (photos.length <= TARGET) return photos

  const total = photos.length
  const stride = Math.max(1, Math.floor(total / TARGET))
  const step = ((reshuffleStep % stride) + stride) % stride

  const indices = [
    step,
    Math.min(total - 1, Math.floor(total / 2) + (step % 2 === 0 ? step : -step)),
    Math.max(0, total - 1 - step),
  ]

  const unique: number[] = []
  for (const i of indices) {
    if (!unique.includes(i)) unique.push(i)
  }

  let cursor = 0
  while (unique.length < TARGET) {
    if (!unique.includes(cursor)) unique.push(cursor)
    cursor += 1
  }

  return unique.slice(0, TARGET).sort((a, b) => a - b).map((i) => photos[i])
}

export function maxReshuffleSteps(photos: Photo[]): number {
  if (photos.length <= TARGET) return 1
  return Math.max(1, Math.floor(photos.length / TARGET))
}
