// Utility functions for handling Supabase operations with rate limiting protection

export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      // Check if it's a rate limiting error
      if (error.message?.includes("Too Many Requests") || error.message?.includes("rate limit")) {
        if (attempt < maxRetries) {
          // Wait with exponential backoff
          const waitTime = delay * Math.pow(2, attempt - 1)
          console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }
      }

      // If it's not a rate limit error, or we've exhausted retries, throw immediately
      throw error
    }
  }

  throw lastError!
}

export function isRateLimitError(error: any): boolean {
  return error.message?.includes("Too Many Requests") || error.message?.includes("rate limit") || error.status === 429
}

export function getErrorMessage(error: any): string {
  if (isRateLimitError(error)) {
    return "Rate limit exceeded. Please wait a moment and try again."
  }

  if (error.message?.includes("JWT")) {
    return "Authentication error. Please refresh the page and try again."
  }

  if (error.code === "PGRST116") {
    return "Database table not found. Please run the database setup."
  }

  return error.message || "An unexpected error occurred"
}
