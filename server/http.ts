import type { IncomingMessage, ServerResponse } from "node:http"
import { adminAuth } from "./firebaseAdmin"

export interface ApiRequest extends IncomingMessage {
  body?: unknown
  query: Record<string, string | string[] | undefined>
}

export interface ApiResponse extends ServerResponse {
  status(code: number): this
  json(body: unknown): this
}

export function preventCaching(res: ApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0")
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface SessionUser {
  uid: string
  email: string | null
  displayName: string | null
}

const PRODUCTION_SESSION_COOKIE = "__Host-pocket_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5

function sessionCookieName() {
  return process.env.NODE_ENV === "production" ? PRODUCTION_SESSION_COOKIE : "pocket_session"
}

export function requireMethod(
  req: ApiRequest,
  res: ApiResponse,
  method: string,
) {
  if (req.method !== method) {
    res.setHeader("Allow", method)
    throw new ApiError(405, "Method not allowed")
  }
}

export function requestBody(req: ApiRequest): Record<string, unknown> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw new ApiError(400, "Invalid request body")
  }
  return req.body as Record<string, unknown>
}

export function assertAllowedFields(
  body: Record<string, unknown>,
  allowedFields: readonly string[],
) {
  const unknown = Object.keys(body).find((key) => !allowedFields.includes(key))
  if (unknown) throw new ApiError(400, `Unexpected field: ${unknown}`)
}

export function assertSameOrigin(req: ApiRequest) {
  const origin = req.headers.origin
  if (!origin) return

  const host = req.headers["x-forwarded-host"] ?? req.headers.host
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new ApiError(403, "Request origin is not allowed")
  }
  if (typeof host !== "string" || originHost !== host) {
    throw new ApiError(403, "Request origin is not allowed")
  }
}

function readCookie(req: ApiRequest, name: string) {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return undefined

  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=")
    if (key === name) {
      try {
        return decodeURIComponent(value.join("="))
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

export function setSessionCookie(res: ApiResponse, value: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName()}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`,
  )
}

export function clearSessionCookie(res: ApiResponse) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
  )
}

export async function requireUser(
  req: ApiRequest,
  options: { includeCurrentProfile?: boolean } = {},
): Promise<SessionUser> {
  const sessionCookie = readCookie(req, sessionCookieName())
  if (!sessionCookie) throw new ApiError(401, "Sign in to continue")

  const auth = adminAuth()
  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true)
    if (!options.includeCurrentProfile) {
      return {
        uid: decoded.uid,
        email: typeof decoded.email === "string" ? decoded.email : null,
        displayName: typeof decoded.name === "string" ? decoded.name : null,
      }
    }
    const user = await auth.getUser(decoded.uid)
    return {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
    }
  } catch {
    throw new ApiError(401, "Your session has expired. Please sign in again.")
  }
}

export function sendError(
  res: ApiResponse,
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message })
  }

  console.error("PocketTrack API error:", error)
  return res.status(500).json({ error: fallbackMessage })
}

export function requiredDocumentId(req: ApiRequest) {
  const id = req.query.id
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new ApiError(400, "Document ID is invalid")
  }
  return id
}
