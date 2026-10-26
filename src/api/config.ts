const BYTES_PER_MB = 1024 * 1024
const DEFAULT_MAX_UPLOAD_MB = 50

function positiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const API_BASE_URL = (import.meta.env.DP_API_BASE_URL ?? '/api').replace(/\/+$/, '')

export const USE_MOCK_API = import.meta.env.DP_USE_MOCK === 'true'

export const MAX_UPLOAD_BYTES =
    positiveNumber(import.meta.env.DP_MAX_FILE_SIZE_MB, DEFAULT_MAX_UPLOAD_MB) * BYTES_PER_MB

export const ALLOWED_EXTENSIONS: readonly string[] = ['.csv', '.xlsx']
