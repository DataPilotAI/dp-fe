import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, ProtocolError } from '../lib/http'
import { streamChat } from './chat'

function sseResponse(...events: unknown[]): Response {
    const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
}

async function drain(iterable: AsyncIterable<unknown>): Promise<unknown[]> {
    const items: unknown[] = []
    for await (const item of iterable) items.push(item)
    return items
}

const params = { datasetId: 'a/b', message: 'hi', history: [], signal: new AbortController().signal }

afterEach(() => vi.unstubAllGlobals())

describe('streamChat', () => {
    it('rejects events that are not part of the contract', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse({ type: 'mystery' })))
        await expect(drain(streamChat(params))).rejects.toBeInstanceOf(ProtocolError)
    })

    it('rejects events with the wrong shape', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse({ type: 'token' })))
        await expect(drain(streamChat(params))).rejects.toBeInstanceOf(ProtocolError)
    })

    it('posts the message and yields events until done', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            sseResponse({ type: 'token', text: 'a' }, { type: 'done' }, { type: 'token', text: 'ignored' }),
        )
        vi.stubGlobal('fetch', fetchMock)

        const events = await drain(streamChat(params))

        expect(events).toEqual([{ type: 'token', text: 'a' }, { type: 'done' }])
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe('/api/datasets/a%2Fb/chat')
        expect(init.method).toBe('POST')
        expect(JSON.parse(init.body as string)).toEqual({ message: 'hi', history: [] })
    })

    it('throws an ApiError for a failed response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })))
        await expect(drain(streamChat(params))).rejects.toBeInstanceOf(ApiError)
    })
})
