import type { z } from 'zod'
import { ApiError, abortError, errorFromResponse } from './errors'
import { parseWithSchema } from './json'

export interface UploadRequest<S extends z.ZodType> {
    url: string
    body: FormData
    schema: S
    /** Called with a fraction from 0 to 1. */
    onProgress?: (fraction: number) => void
    signal?: AbortSignal
}

async function readResponse<S extends z.ZodType>(request: XMLHttpRequest, schema: S): Promise<z.infer<S>> {
    const failed = request.status < 200 || request.status >= 300
    if (failed) throw await errorFromResponse(new Response(request.responseText, { status: request.status }))
    return parseWithSchema(request.responseText, schema)
}

/** XMLHttpRequest rather than fetch, because fetch cannot report upload progress. */
export function uploadForm<S extends z.ZodType>({
    url,
    body,
    schema,
    onProgress,
    signal,
}: UploadRequest<S>): Promise<z.infer<S>> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError('Upload cancelled'))

        const request = new XMLHttpRequest()
        request.open('POST', url)

        request.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total)
        }
        request.onerror = () => reject(new ApiError(0, 'Could not reach the server.'))
        request.onabort = () => reject(abortError('Upload cancelled'))
        request.onload = () => readResponse(request, schema).then(resolve, reject)
        signal?.addEventListener('abort', () => request.abort(), { once: true })

        request.send(body)
    })
}
