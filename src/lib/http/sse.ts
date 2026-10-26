import type { z } from 'zod'
import { ProtocolError, errorFromResponse } from './errors'
import { jsonPost, parseWithSchema } from './json'

const EVENT_BOUNDARY = '\n\n'

function dataOfBlock(block: string): string | null {
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
        if (line === '' || line.startsWith(':')) continue

        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        if (field !== 'data') continue

        const value = colon === -1 ? '' : line.slice(colon + 1)
        dataLines.push(value.startsWith(' ') ? value.slice(1) : value)
    }
    return dataLines.length > 0 ? dataLines.join('\n') : null
}

function splitBlocks(buffer: string): { blocks: string[]; rest: string } {
    const parts = buffer.split(EVENT_BOUNDARY)
    const rest = parts.pop() ?? ''
    return { blocks: parts, rest }
}

/** Yields the `data` payload of each server-sent event in a response body. */
export async function* readSseData(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let heldCarriageReturn = false

    try {
        for (; ;) {
            const { done, value } = await reader.read()
            let text = done ? decoder.decode() : decoder.decode(value, { stream: true })

            // A trailing \r may be the first half of \r\n split across chunks.
            if (heldCarriageReturn) text = `\r${text}`
            heldCarriageReturn = !done && text.endsWith('\r')
            if (heldCarriageReturn) text = text.slice(0, -1)

            buffer += text.replace(/\r\n?/g, '\n')
            const { blocks, rest } = splitBlocks(buffer)
            buffer = rest

            for (const block of blocks) {
                const data = dataOfBlock(block)
                if (data !== null) yield data
            }
            if (done) break
        }

        const last = dataOfBlock(buffer)
        if (last !== null) yield last
    } finally {
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
    }
}

export interface EventStreamRequest<S extends z.ZodType> {
    url: string
    body: unknown
    /** Schema for the JSON carried by each `data:` line. */
    schema: S
    signal?: AbortSignal
}

/** POSTs JSON and yields each streamed event, validated against `schema`. */
export async function* streamJsonEvents<S extends z.ZodType>({
    url,
    body,
    schema,
    signal,
}: EventStreamRequest<S>): AsyncGenerator<z.infer<S>> {
    const response = await fetch(url, jsonPost(body, signal, { Accept: 'text/event-stream' }))
    if (!response.ok) throw await errorFromResponse(response)
    if (!response.body) throw new ProtocolError('The server did not send a stream.')

    for await (const data of readSseData(response.body)) yield parseWithSchema(data, schema)
}
