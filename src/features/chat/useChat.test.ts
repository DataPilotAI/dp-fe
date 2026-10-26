import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatEvent } from '../../api/schemas'
import type { DataPilotApi } from '../../api/types'
import { useChat } from './useChat'

const unused = () => Promise.reject(new Error('not used in this test'))

function apiWith(overrides: Partial<DataPilotApi>): DataPilotApi {
    return {
        uploadDataset: unused,
        streamChat: async function* () { },
        approveCleanup: unused,
        rejectCleanup: unused,
        ...overrides,
    }
}

function eventsOf(...events: ChatEvent[]): DataPilotApi['streamChat'] {
    return async function* () {
        for (const event of events) yield event
    }
}

const proposal = {
    id: 'p1',
    title: 'Trim',
    operations: [{ id: 'o1', kind: 'trim', description: 'Trim whitespace' }],
}

describe('useChat', () => {
    it('streams tokens into the assistant reply', async () => {
        const api = apiWith({
            streamChat: eventsOf({ type: 'token', text: 'Hel' }, { type: 'token', text: 'lo' }, { type: 'done' }),
        })
        const { result } = renderHook(() => useChat('d1', api))

        await act(() => result.current.send('hi'))

        expect(result.current.messages.map((message) => message.text)).toEqual(['hi', 'Hello'])
        expect(result.current.isStreaming).toBe(false)
    })

    it('ignores blank messages', async () => {
        const streamChat = vi.fn(eventsOf())
        const { result } = renderHook(() => useChat('d1', apiWith({ streamChat })))

        await act(() => result.current.send('   '))

        expect(streamChat).not.toHaveBeenCalled()
        expect(result.current.messages).toEqual([])
    })

    it('sends earlier turns as history', async () => {
        const streamChat = vi.fn(eventsOf({ type: 'token', text: 'ok' }, { type: 'done' }))
        const { result } = renderHook(() => useChat('d1', apiWith({ streamChat })))

        await act(() => result.current.send('first'))
        await act(() => result.current.send('second'))

        expect(streamChat.mock.calls[1]?.[0].history).toEqual([
            { role: 'user', content: 'first' },
            { role: 'assistant', content: 'ok' },
        ])
    })

    it('shows a readable error when the stream fails', async () => {
        const api = apiWith({
            streamChat: () => {
                throw new Error('internal detail')
            },
        })
        const { result } = renderHook(() => useChat('d1', api))

        await act(() => result.current.send('hi'))

        const reply = result.current.messages[1]
        expect(reply?.role === 'assistant' && reply.error).toBe('Something went wrong. Please try again.')
        expect(result.current.isStreaming).toBe(false)
    })

    it('stops streaming without an error when aborted', async () => {
        const api = apiWith({
            streamChat: async function* ({ signal }) {
                yield { type: 'token', text: 'partial' } as const
                await new Promise((_, reject) => {
                    signal.addEventListener('abort', () =>
                        reject(new DOMException('aborted', 'AbortError')),
                    )
                })
            },
        })
        const { result } = renderHook(() => useChat('d1', api))

        let pending: Promise<void> = Promise.resolve()
        act(() => {
            pending = result.current.send('hi')
        })
        await waitFor(() => expect(result.current.messages[1]?.text).toBe('partial'))
        await act(async () => {
            result.current.stop()
            await pending
        })

        const reply = result.current.messages[1]
        expect(reply?.role === 'assistant' && reply.error).toBeUndefined()
        expect(reply?.role === 'assistant' && reply.streaming).toBe(false)
    })

    it('approves a proposal and records the result', async () => {
        const approveCleanup = vi.fn().mockResolvedValue({ status: 'applied', message: 'done' })
        const api = apiWith({
            streamChat: eventsOf({ type: 'cleanup_proposal', proposal }, { type: 'done' }),
            approveCleanup,
        })
        const { result } = renderHook(() => useChat('d1', api))
        await act(() => result.current.send('clean'))

        await act(() => result.current.approve('p1', ['o1']))

        expect(approveCleanup).toHaveBeenCalledWith('d1', 'p1', ['o1'])
        const reply = result.current.messages[1]
        expect(reply?.role === 'assistant' && reply.proposals[0]).toMatchObject({
            status: 'applied',
            message: 'done',
        })
    })

    it('marks a proposal as failed so it can be retried', async () => {
        const api = apiWith({
            streamChat: eventsOf({ type: 'cleanup_proposal', proposal }, { type: 'done' }),
            approveCleanup: () => Promise.reject(new Error('nope')),
        })
        const { result } = renderHook(() => useChat('d1', api))
        await act(() => result.current.send('clean'))

        await act(() => result.current.approve('p1', ['o1']))

        const reply = result.current.messages[1]
        expect(reply?.role === 'assistant' && reply.proposals[0]?.status).toBe('failed')
    })

    it('rejects a proposal', async () => {
        const rejectCleanup = vi.fn().mockResolvedValue({ status: 'rejected' })
        const api = apiWith({
            streamChat: eventsOf({ type: 'cleanup_proposal', proposal }, { type: 'done' }),
            rejectCleanup,
        })
        const { result } = renderHook(() => useChat('d1', api))
        await act(() => result.current.send('clean'))

        await act(() => result.current.reject('p1'))

        expect(rejectCleanup).toHaveBeenCalledWith('d1', 'p1')
        const reply = result.current.messages[1]
        expect(reply?.role === 'assistant' && reply.proposals[0]?.status).toBe('rejected')
    })
})
