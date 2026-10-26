import { fileExtension, formatBytes } from '../lib/format'
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES } from './config'

/**
 * Client-side check for a friendlier message only. The server must enforce
 * type and size limits itself; this is not a security control.
 */
export function validateUploadFile(file: File): string | null {
    if (file.size === 0) return 'The file is empty.'
    if (file.size > MAX_UPLOAD_BYTES) {
        return `The file is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`
    }
    if (!ALLOWED_EXTENSIONS.includes(fileExtension(file.name))) {
        return `Unsupported file type. Use ${ALLOWED_EXTENSIONS.join(', ')}.`
    }
    return null
}
