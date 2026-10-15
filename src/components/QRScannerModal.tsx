import { useEffect, useRef, useState, useCallback } from "react"
import QrScanner from "qr-scanner"
import {
  Camera,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  X,
  Zap,
  ZapOff,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface QRScannerModalProps {
  open: boolean
  onClose: () => void
  onScan: (rawText: string) => void
}

function isRearCamera(label: string): boolean {
  return /rear|back|environment|sau|traser|posterior|posteriore|rück|hinten|arrière|main/i.test(label)
}

function isFrontCamera(label: string): boolean {
  return /front|user|face|selfie|trước|truoc|vorder|avant|anterior/i.test(label)
}

function findBestRearCamera(cameras: QrScanner.Camera[]): QrScanner.Camera | undefined {
  return cameras.find((c) => isRearCamera(c.label)) || cameras.find((c) => !isFrontCamera(c.label))
}

export default function QRScannerModal({
  open,
  onClose,
  onScan,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userSwitchedRef = useRef(false)
  const selectedCameraIdRef = useRef<string | undefined>(undefined)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<QrScanner.Camera[]>([])

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop()
        scannerRef.current.destroy()
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null
    }

    // Ensure all MediaStream tracks are explicitly stopped to shut down camera indicator
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [])

  const handleScanSuccess = useCallback(
    (data: string) => {
      // Trigger subtle haptic vibration if supported on device
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(60)
        }
      } catch {
        // Ignore haptics error
      }

      stopScanner()
      onScan(data)
    },
    [onScan, stopScanner],
  )

  const [retryCounter, setRetryCounter] = useState(0)

  // Manage scanner lifecycle on open/close and camera changes
  useEffect(() => {
    if (!open) {
      userSwitchedRef.current = false
      selectedCameraIdRef.current = undefined
      stopScanner()
      return
    }

    let isSubscribed = true
    const videoElem = videoRef.current
    if (!videoElem) return

    // Reset state before every new camera session so stale "ready" never lingers
    stopScanner()

    const isSecure =
      location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"

    let cameraTimeout: number | undefined
    let cameraResolved = false

    const initScanner = async () => {
      // Yield to next microtask so state resets don't trigger synchronous effect cascading renders
      await Promise.resolve()
      if (!isSubscribed) return

      setCameraReady(false)
      setCameraError(null)

      if (!isSecure) {
        setCameraError(
          "Camera access requires a secure HTTPS connection. You can still upload a QR code image from your gallery below.",
        )
        return
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError(
          window.isSecureContext === false
            ? "Camera access requires a secure HTTPS connection. You can upload a QR code image from your gallery below."
            : "No camera found or camera API is not supported on this browser. You can upload a QR code image below.",
        )
        return
      }

      // Safety timeout: if .start() never resolves (no hardware, silently blocked),
      // stop the spinner after 4 s and show the upload fallback with retry.
      cameraTimeout = window.setTimeout(() => {
        if (isSubscribed && !cameraResolved) {
          setCameraError(
            "Camera preview timed out. No active camera was detected or permission was not granted. You can retry or upload a photo below.",
          )
          setCameraReady(false)
        }
      }, 4000)

      const qrScanner = new QrScanner(
        videoElem,
        (result) => {
          if (result && result.data) {
            handleScanSuccess(result.data)
          }
        },
        {
          preferredCamera: selectedCameraIdRef.current || "environment",
          highlightScanRegion: false,
          highlightCodeOutline: false,
          returnDetailedScanResult: true,
          maxScansPerSecond: 10,
        },
      )

      scannerRef.current = qrScanner

      try {
        await qrScanner.start()
        cameraResolved = true
        if (cameraTimeout) clearTimeout(cameraTimeout)
        if (!isSubscribed) return
        setCameraReady(true)
        setCameraError(null)

        try {
          const flashAvailable = await qrScanner.hasFlash()
          if (isSubscribed) setHasFlash(flashAvailable)
        } catch {
          if (isSubscribed) setHasFlash(false)
        }

        try {
          const cameras = await QrScanner.listCameras(true)
          if (isSubscribed) {
            setAvailableCameras(cameras)

            // If the user has not manually switched cameras and the browser opened
            // a front camera by default, auto-correct to the rear camera if available.
            if (!userSwitchedRef.current && cameras.length > 1) {
              const currentTrack = (videoElem.srcObject as MediaStream)?.getVideoTracks()[0]
              const currentFacing = currentTrack?.getSettings()?.facingMode
              const currentLabel = currentTrack?.label || ""
              const isFrontActive = currentFacing === "user" || isFrontCamera(currentLabel)

              if (isFrontActive) {
                const bestRear = findBestRearCamera(cameras)
                if (bestRear && bestRear.id !== currentTrack?.getSettings()?.deviceId) {
                  await qrScanner.setCamera(bestRear.id)
                  selectedCameraIdRef.current = bestRear.id
                }
              }
            }
          }
        } catch {
          if (isSubscribed) setAvailableCameras([])
        }
      } catch (err: unknown) {
        cameraResolved = true
        if (cameraTimeout) clearTimeout(cameraTimeout)
        if (!isSubscribed) return
        const errString = typeof err === "string" ? err : ""
        const error = (typeof err === "object" && err !== null ? err : {}) as { name?: string; message?: string }
        const errName = error.name || ""
        const errMsg = error.message || errString

        // AbortError = play() was interrupted by the next srcObject load.
        // QrScanner retries internally — this is always harmless. Suppress it.
        if (errName === "AbortError") return

        let message = "Could not start camera."

        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          message =
            "Camera permission was denied. Please allow camera access in your browser settings, or upload an image from your gallery below."
        } else if (
          errName === "NotFoundError" ||
          errName === "DevicesNotFoundError" ||
          errName === "OverconstrainedError" ||
          errMsg.includes("Camera not found")
        ) {
          message = "No camera found on this device. You can upload a photo of a QR code below."
        } else if (errName === "NotReadableError" || errName === "TrackStartError") {
          message =
            "Camera is currently in use by another application. Please close other camera apps and retry, or upload an image."
        } else if (errName === "SecurityError" || errMsg.toLowerCase().includes("https")) {
          message =
            "Camera access requires a secure HTTPS connection. You can upload a QR code image from your gallery below."
        } else if (errMsg) {
          message = `Camera error: ${errMsg}`
        }

        setCameraError(message)
        setCameraReady(false)
      }
    }

    void initScanner()

    return () => {
      isSubscribed = false
      if (cameraTimeout) clearTimeout(cameraTimeout)
      stopScanner()
    }
  }, [open, retryCounter, handleScanSuccess, stopScanner])

  // Handle flashlight toggle
  const handleToggleFlash = async () => {
    if (!scannerRef.current || !hasFlash) return
    try {
      await scannerRef.current.toggleFlash()
      setIsFlashOn(scannerRef.current.isFlashOn())
    } catch {
      // Ignore flash failure
    }
  }

  // Handle switching camera (e.g. front vs rear)
  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) return
    userSwitchedRef.current = true

    const currentTrack = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0]
    const activeDeviceId = currentTrack?.getSettings()?.deviceId || selectedCameraIdRef.current
    const currentIndex = availableCameras.findIndex((c) => c.id === activeDeviceId)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableCameras.length : 0
    const nextCamera = availableCameras[nextIndex]

    selectedCameraIdRef.current = nextCamera.id

    if (scannerRef.current) {
      try {
        await scannerRef.current.setCamera(nextCamera.id)
      } catch {
        setRetryCounter((c) => c + 1)
      }
    }
  }

  // Handle gallery file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)
    setIsProcessingFile(true)

    try {
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      })

      if (result && result.data) {
        handleScanSuccess(result.data)
      } else {
        setFileError("No readable QR code found in this image. Please try a clearer picture.")
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      if (
        error?.message?.includes(QrScanner.NO_QR_CODE_FOUND) ||
        error?.message?.toLowerCase().includes("no qr")
      ) {
        setFileError("No QR code detected in this image. Make sure the QR code is clearly visible and well-lit.")
      } else {
        setFileError("Could not process this image. Please select a valid JPEG, PNG, or WebP file.")
      }
    } finally {
      setIsProcessingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 sm:p-4"
    >
      {/* Container */}
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-zinc-950 sm:h-[620px] sm:rounded-3xl sm:border sm:border-zinc-800 sm:shadow-2xl">
        
        {/* Header Bar */}
        <div className="relative z-20 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h2 id="qr-scanner-title" className="text-sm font-semibold text-white">
                Scan QR or Receipt
              </h2>
              <p className="text-[11px] text-zinc-400">
                VietQR, e-invoices, and digital receipts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Flash toggle */}
            {hasFlash && (
              <button
                type="button"
                onClick={() => void handleToggleFlash()}
                aria-label={isFlashOn ? "Turn flash off" : "Turn flash on"}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  isFlashOn
                    ? "bg-amber-400 text-zinc-950"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {isFlashOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              </button>
            )}

            {/* Camera Switcher (front/rear) */}
            {availableCameras.length > 1 && (
              <button
                type="button"
                onClick={() => void handleSwitchCamera()}
                aria-label="Switch camera"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close scanner"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
          {/* Live Video Preview */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {/* Scanner Viewfinder Overlay */}
          {!cameraError && cameraReady && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {/* Clearly visible square scanning frame */}
              <div className="relative h-64 w-64 sm:h-72 sm:w-72 overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] shadow-[0_0_24px_rgba(16,185,129,0.12)]">
                {/* 4 Corner Guide Brackets (Emerald / Green) */}
                <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-emerald-400" />
                <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-emerald-400" />
                <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-emerald-400" />

                {/* Smooth scanning laser line moving continuously top to bottom and back */}
                <div className="animate-qr-scan absolute inset-x-2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399]" />
              </div>

              <p className="mt-4 rounded-full bg-zinc-950/70 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
                Align QR code within the frame
              </p>
            </div>
          )}

          {/* Camera Loading state */}
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm font-medium text-zinc-300">
                Starting camera preview...
              </p>
              <p className="text-xs text-zinc-500 max-w-xs">
                Requesting rear camera access. Please allow camera permissions if prompted.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-zinc-800 hover:text-emerald-300"
              >
                <ImageIcon className="h-4 w-4" />
                Upload QR image instead
              </button>
            </div>
          )}

          {/* Camera Error state */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Camera Unavailable
              </h3>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-400">
                {cameraError}
              </p>

              <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  <ImageIcon className="h-4 w-4" />
                  Choose Photo from Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setRetryCounter((c) => c + 1)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry Camera
                </button>
              </div>
            </div>
          )}

          {/* File processing overlay */}
          {isProcessingFile && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/80 backdrop-blur-xs">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-xs font-semibold text-white">
                Reading QR code from image...
              </p>
            </div>
          )}
        </div>

        {/* File Error Notification */}
        {fileError && (
          <div className="relative z-20 border-t border-red-900/50 bg-red-950/80 px-4 py-2.5 text-xs font-medium text-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p>{fileError}</p>
              </div>
              <button
                type="button"
                onClick={() => setFileError(null)}
                className="text-red-400 hover:text-red-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="relative z-20 flex flex-col gap-2 border-t border-zinc-800/80 bg-zinc-950 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-3">
          {/* Gallery upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileUpload(e)}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4 text-emerald-400" />
            Upload QR Code Image from Gallery
          </button>

          <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
            <Sparkles className="h-3 w-3 text-emerald-400/80" />
            <span>Decoded securely and locally in your browser.</span>
          </div>
        </div>

      </div>
    </div>
  )
}
