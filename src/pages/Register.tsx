import { useState } from "react"
import { Link } from "react-router-dom"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { Wallet, Eye, EyeOff } from "lucide-react"
import { auth } from "../lib/firebase"

export default function Register() {
  const [name, setName]               = useState("")
  const [email, setEmail]             = useState("")
  const [password, setPassword]       = useState("")
  const [confirm, setConfirm]         = useState("")
  const [showPw, setShowPw]           = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]             = useState("")
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: name.trim() })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed."
      if (msg.includes("email-already-in-use")) {
        setError("An account with this email already exists.")
      } else if (msg.includes("invalid-email")) {
        setError("Please enter a valid email address.")
      } else if (msg.includes("weak-password")) {
        setError("Password must be at least 6 characters.")
      } else {
        setError("Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
            <Wallet className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">PocketTrack</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Create your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="reg-name"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:bg-zinc-900"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="reg-email"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:bg-zinc-900"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 px-4 py-3 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="reg-confirm"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 px-4 py-3 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:text-zinc-500"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
