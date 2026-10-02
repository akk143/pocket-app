import { useCallback, useEffect, useRef, useState } from "react"
import type { ComponentProps } from "react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

type PlayerRefCallback = NonNullable<
  ComponentProps<typeof DotLottieReact>["dotLottieRefCallback"]
>

interface StartupSplashProps {
  visible: boolean
  onAnimationComplete: () => void
}

export default function StartupSplash({
  visible,
  onAnimationComplete,
}: StartupSplashProps) {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const [animationFailed, setAnimationFailed] = useState(false)
  const [travelComplete, setTravelComplete] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const finishedRef = useRef(false)

  const finishAnimation = useCallback((failed = false) => {
    if (finishedRef.current) return
    finishedRef.current = true
    setTravelComplete(true)
    if (failed) {
      setAnimationFailed(true)
      onAnimationComplete()
      return
    }
    setIsExiting(true)
    window.setTimeout(onAnimationComplete, 250)
  }, [onAnimationComplete])

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setReducedMotion(preference.matches)
    preference.addEventListener("change", updatePreference)
    return () => preference.removeEventListener("change", updatePreference)
  }, [])

  useEffect(() => {
    if (!visible) return
    if (reducedMotion) {
      const timeoutId = window.setTimeout(() => {
        if (finishedRef.current) return
        finishedRef.current = true
        onAnimationComplete()
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }

    const timeoutId = window.setTimeout(() => finishAnimation(true), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [finishAnimation, onAnimationComplete, reducedMotion, visible])

  const handlePlayerRef: PlayerRefCallback = useCallback((player) => {
    if (!player) return
    player.addEventListener("loadError", () => finishAnimation(true))
    player.addEventListener("renderError", () => finishAnimation(true))
  }, [finishAnimation])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[200] flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f7f7f5] px-[max(1rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-opacity duration-200 dark:bg-zinc-950 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex w-full flex-col items-center">
        {!reducedMotion && !animationFailed && (
          <div
            className="startup-runner absolute left-0 top-[30%] h-[min(42dvh,22rem)] w-[clamp(9rem,30vw,22rem)]"
            onAnimationEnd={() => finishAnimation()}
          >
            <DotLottieReact
              src="/animations/Doraemon%20Run.lottie"
              autoplay
              loop={!travelComplete}
              dotLottieRefCallback={handlePlayerRef}
            />
          </div>
        )}
        <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          PocketTrack
        </p>
      </div>
    </div>
  )
}
