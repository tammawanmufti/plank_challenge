import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

import type { DetectorSnapshot } from './types'

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
// Use an immutable model path to keep detector behavior reproducible across releases.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

let detectorPromise: Promise<FaceDetector> | null = null

type DeviceNavigator = Navigator & {
  deviceMemory?: number
}

function estimateFrameQuality(video: HTMLVideoElement, canvas: HTMLCanvasElement): {
  lowLight: boolean
  blur: boolean
} {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return { lowLight: false, blur: false }
  }

  const sampleWidth = 80
  const sampleHeight = 60

  canvas.width = sampleWidth
  canvas.height = sampleHeight

  context.drawImage(video, 0, 0, sampleWidth, sampleHeight)

  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight).data

  let brightnessTotal = 0
  let gradientTotal = 0
  let pixelCount = 0

  const getLuma = (x: number, y: number): number => {
    const index = (y * sampleWidth + x) * 4
    const r = imageData[index]
    const g = imageData[index + 1]
    const b = imageData[index + 2]
    return (r * 0.299 + g * 0.587 + b * 0.114)
  }

  for (let y = 1; y < sampleHeight; y += 1) {
    for (let x = 1; x < sampleWidth; x += 1) {
      const luma = getLuma(x, y)
      const left = getLuma(x - 1, y)
      const up = getLuma(x, y - 1)

      brightnessTotal += luma
      gradientTotal += Math.abs(luma - left) + Math.abs(luma - up)
      pixelCount += 1
    }
  }

  const averageBrightness = pixelCount > 0 ? brightnessTotal / pixelCount : 100
  const averageGradient = pixelCount > 0 ? gradientTotal / pixelCount : 100

  return {
    lowLight: averageBrightness < 45,
    blur: averageGradient < 16,
  }
}

export function getPerformanceProfile(): {
  detectorIntervalMs: number
  tier: 'high' | 'mid' | 'low'
} {
  const nav = navigator as DeviceNavigator
  const deviceMemory = nav.deviceMemory ?? 8
  const cpuCores = navigator.hardwareConcurrency ?? 8

  if (deviceMemory <= 4 || cpuCores <= 4) {
    return { detectorIntervalMs: 200, tier: 'low' }
  }

  if (deviceMemory <= 8 || cpuCores <= 8) {
    return { detectorIntervalMs: 150, tier: 'mid' }
  }

  return { detectorIntervalMs: 100, tier: 'high' }
}

export async function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const resolver = await FilesetResolver.forVisionTasks(WASM_BASE_URL)

      try {
        return await FaceDetector.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.6,
        })
      } catch {
        return FaceDetector.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.6,
        })
      }
    })().catch((error) => {
      detectorPromise = null
      throw error
    })
  }

  return detectorPromise
}

export async function detectFaceSnapshot(
  detector: FaceDetector,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<DetectorSnapshot> {
  const result = detector.detectForVideo(video, performance.now())
  const firstDetection = result.detections[0]
  const confidence = firstDetection?.categories?.[0]?.score ?? 0
  const quality = estimateFrameQuality(video, canvas)

  return {
    detected: Boolean(firstDetection),
    confidence,
    lowLight: quality.lowLight,
    blur: quality.blur,
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) {
    return
  }

  for (const track of stream.getTracks()) {
    track.stop()
  }
}
