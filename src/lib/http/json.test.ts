import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, ProtocolError } from './errors'
import { jsonPost, parseWithSchema, requestJson } from './json'

const schema = z.object({ id: z.string() })

afterEach(() => vi.unstubAllGlobals())

describe('parseWithSchema', () => {
    it('returns data that matches the schema', () => {
        expect(parseWithSchema('{"id":"a"}', schema)).toEqual({ id: 'a' })
    })

    it('rejects malformed JSON and wrong shapes', () => {
        expect(() => parseWithSchema('{nope', schema)).toThrow(ProtocolError)
        expect(() => parseWithSchema('{"id":1}', schema)).toThrow(ProtocolError)
    })
})

describe('jsonPost', () => {
    it('builds a JSON POST and merges extra headers', () => {
        const signal = new AbortController().signal
        const init = jsonPost({ a: 1 }, signal, { Accept: 'text/event-stream' })
        expect(init).toEqual({
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
            body: '{"a":1}',
            signal,
        })
    })
})

describe('requestJson', () => {
    it('returns validated data', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"id":"a"}')))
        await expect(requestJson('/x', {}, schema)).resolves.toEqual({ id: 'a' })
    })

    it('throws an ApiError for a failed response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })))
        await expect(requestJson('/x', {}, schema)).rejects.toBeInstanceOf(ApiError)
    })

    it('throws a ProtocolError for an off-contract body', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"id":5}')))
        await expect(requestJson('/x', {}, schema)).rejects.toBeInstanceOf(ProtocolError)
    })
})
