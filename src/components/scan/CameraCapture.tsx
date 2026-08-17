import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `${t('cameraCapture.cameraErrorPrefix')} ${err.message}`
          : t('cameraCapture.cameraErrorGeneric'),
      )
    }
  }, [t])

  useEffect(() => {
    if (!capturedUrl) startCamera()
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedUrl])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setCapturedUrl(URL.createObjectURL(blob))
        stopStream()
      },
      'image/jpeg',
      0.92,
    )
  }

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedUrl(null)
  }

  const handleUse = () => {
    canvasRef.current?.toBlob(
      (blob) => {
        if (blob) onCapture(blob)
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <p className="w-full rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {error} {t('cameraCapture.cameraErrorHint')}
        </p>
      )}

      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900">
        {!capturedUrl && (
          <video ref={videoRef} className="w-full" playsInline muted autoPlay />
        )}
        {capturedUrl && <img src={capturedUrl} alt={t('cameraCapture.capturedAlt')} className="w-full" />}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3">
        {!capturedUrl ? (
          <button
            onClick={handleCapture}
            disabled={!ready}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t('cameraCapture.capture')}
          </button>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('cameraCapture.retake')}
            </button>
            <button
              onClick={handleUse}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {t('cameraCapture.usePhoto')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
