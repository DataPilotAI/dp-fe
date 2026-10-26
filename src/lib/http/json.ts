import type { z } from 'zod'
import { ProtocolError, errorFromResponse } from './errors'

export function jsonPost(
    body: unknown,
    signal?: AbortSignal,
    extraHeaders: Record<string, string> = {},
): RequestInit {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify(body),
        signal,
    }
}

/** Parses untrusted JSON against a schema; anything off-contract becomes a ProtocolError. */
export function parseWithSchema<S extends z.ZodType>(raw: string, schema: S): z.infer<S> {
    let json: unknown
    try {
        json = JSON.parse(raw)
    } catch {
        throw new ProtocolError()
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) throw new ProtocolError()
    return parsed.data
}

export async function requestJson<S extends z.ZodType>(
    url: string,
    init: RequestInit,
    schema: S,
): Promise<z.infer<S>> {
    const response = await fetch(url, init)
    if (!response.ok) throw await errorFromResponse(response)
    return parseWithSchema(await response.text(), schema)
}
