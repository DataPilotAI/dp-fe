import { describe, expect, it } from 'vitest'
import { readSseData } from './sse'

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
            controller.close()
        },
    })
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string[]> {
    const received: string[] = []
    for await (const data of readSseData(stream)) received.push(data)
    return received
}

describe('readSseData', () => {
    it('yields the data of each event', async () => {
        expect(await collect(streamOf('data: one\n\ndata: two\n\n'))).toEqual(['one', 'two'])
    })

    it('reassembles events split across chunks', async () => {
        expect(await collect(streamOf('da', 'ta: hel', 'lo\n', '\ndata: bye\n\n'))).toEqual(['hello', 'bye'])
    })

    it('handles CRLF line endings split across chunks', async () => {
        expect(await collect(streamOf('data: a\r', '\n\r\ndata: b\r\n\r\n'))).toEqual(['a', 'b'])
    })

    it('joins multi-line data and skips comments and other fields', async () => {
        const body = ': keep-alive\nevent: message\ndata: first\ndata: second\n\n'
        expect(await collect(streamOf(body))).toEqual(['first\nsecond'])
    })

    it('yields a final event that has no trailing blank line', async () => {
        expect(await collect(streamOf('data: tail'))).toEqual(['tail'])
    })

    it('keeps multi-byte characters that are split across chunks', async () => {
        const bytes = new TextEncoder().encode('data: héllo\n\n')
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(bytes.slice(0, 8))
                controller.enqueue(bytes.slice(8))
                controller.close()
            },
        })
        expect(await collect(stream)).toEqual(['héllo'])
    })

    it('yields nothing for an empty stream', async () => {
        expect(await collect(streamOf())).toEqual([])
    })
})
