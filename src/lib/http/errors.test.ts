import { describe, expect, it } from 'vitest'
import { ApiError, ProtocolError, abortError, describeError, errorFromResponse, isAbortError } from './errors'

describe('errorFromResponse', () => {
    it('uses a short message from the server body', async () => {
        const error = await errorFromResponse(new Response('{"message":"Bad column"}', { status: 422 }))
        expect(error).toBeInstanceOf(ApiError)
        expect(error).toMatchObject({ status: 422, message: 'Bad column' })
    })

    it('ignores overly long server messages', async () => {
        const body = JSON.stringify({ message: 'x'.repeat(500) })
        expect((await errorFromResponse(new Response(body, { status: 404 }))).message).toBe('That item was not found.')
    })

    it('falls back to a status message when the body is not JSON', async () => {
        expect((await errorFromResponse(new Response('<html>', { status: 429 }))).message).toMatch(/too many/i)
        expect((await errorFromResponse(new Response('boom', { status: 503 }))).message).toMatch(/server had a problem/i)
        expect((await errorFromResponse(new Response('', { status: 418 }))).message).toMatch(/something went wrong/i)
    })
})

describe('describeError', () => {
    it('shows messages from this layer', () => {
        expect(describeError(new ApiError(500, 'Server said no'))).toBe('Server said no')
        expect(describeError(new ProtocolError())).toMatch(/unexpected response/i)
    })

    it('hides the message of unknown errors', () => {
        expect(describeError(new Error('secret stack detail'))).toBe('Something went wrong. Please try again.')
        expect(describeError('oops')).toBe('Something went wrong. Please try again.')
    })
})

describe('isAbortError', () => {
    it('recognises abort errors only', () => {
        expect(isAbortError(abortError())).toBe(true)
        expect(isAbortError(new Error('Aborted'))).toBe(false)
    })
})
