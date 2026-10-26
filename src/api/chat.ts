import { streamJsonEvents } from '../lib/http'
import { endpoints } from './endpoints'
import { chatEventSchema } from './schemas'
import type { ChatEvent } from './schemas'
import type { StreamChatParams } from './types'

/**
 * Sends a message and yields the reply as it streams in; ends after the `done` event.
 * Each `data:` line of the response is one JSON ChatEvent.
 */
export async function* streamChat({
    datasetId,
    message,
    history,
    signal,
}: StreamChatParams): AsyncGenerator<ChatEvent> {
    const events = streamJsonEvents({
        url: endpoints.chat(datasetId),
        body: { message, history },
        schema: chatEventSchema,
        signal,
    })
    for await (const event of events) {
        yield event
        if (event.type === 'done') return
    }
}
