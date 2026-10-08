/**
 * Shared 429 copy for public form rate limiting.
 * Kept in a dependency-free module so client form components can import it
 * without pulling @upstash/redis into the browser bundle.
 */
export const RATE_LIMIT_ERROR_MESSAGE =
  "Too many attempts, please wait a few minutes and try again.";
