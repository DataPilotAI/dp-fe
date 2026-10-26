const MAX_SERVER_MESSAGE_LENGTH = 200
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response.'

const STATUS_MESSAGES: Record<number, string> = {
    401: 'You are not signed in.',
    403: 'You are not allowed to do that.',
    404: 'That item was not found.',
    413: 'The file is too large.',
    415: 'That file type is not supported.',
    429: 'Too many requests. Please wait a moment.',
}

export class ApiError extends Error {
    readonly status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

/** The server answered, but not in the shape the client expects. */
export class ProtocolError extends Error {
    constructor(message: string = UNEXPECTED_RESPONSE_MESSAGE) {
        super(message)
        this.name = 'ProtocolError'
    }
}

export function abortError(message = 'Aborted'): DOMException {
    return new DOMException(message, 'AbortError')
}

export function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError'
}

/** Only errors raised by this layer carry text that is safe to show; anything else is generic. */
export function describeError(error: unknown): string {
    if (error instanceof ApiError || error instanceof ProtocolError) return error.message
    return GENERIC_ERROR_MESSAGE
}

function messageForStatus(status: number): string {
    if (status >= 500) return 'The server had a problem. Please try again.'
    return STATUS_MESSAGES[status] ?? GENERIC_ERROR_MESSAGE
}

async function serverMessage(response: Response): Promise<string | null> {
    try {
        const body: unknown = await response.json()
        if (typeof body === 'object' && body !== null && 'message' in body) {
            const { message } = body
            if (typeof message === 'string' && message.length <= MAX_SERVER_MESSAGE_LENGTH) return message
        }
    } catch {
        return null
    }
    return null
}

export async function errorFromResponse(response: Response): Promise<ApiError> {
    const message = (await serverMessage(response)) ?? messageForStatus(response.status)
    return new ApiError(response.status, message)
}
