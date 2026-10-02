export class ApiRequestError extends Error {
  public readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  })

  const result = await response.json().catch(() => null) as
    | { error?: string }
    | T
    | null

  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "The request failed. Please try again."
    const isAuthenticationEntry = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/session",
      "/api/auth/logout",
    ].includes(path)
    if (
      response.status === 401 &&
      !isAuthenticationEntry &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("pockettrack:session-expired"))
    }
    throw new ApiRequestError(message, response.status)
  }

  if (result === null) {
    throw new ApiRequestError("PocketTrack server returned an invalid response.", response.status)
  }

  return result as T
}
