import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { api as defaultApi } from '../../api'
import { describeError, isAbortError } from '../../lib/http'
import type { ChatEvent, CleanupResult } from '../../api/schemas'
import type { ChatTurn, DataPilotApi } from '../../api/types'
import { chatReducer } from './chatState'
import type { ChatAction, ChatMessage, ProposalStatus } from './chatState'

const MAX_HISTORY_MESSAGES = 20

function toHistory(messages: ChatMessage[]): ChatTurn[] {
    return messages
        .filter((message) => message.text !== '')
        .slice(-MAX_HISTORY_MESSAGES)
        .map((message) => ({ role: message.role, content: message.text }))
}

function eventToAction(assistantId: string, event: ChatEvent): ChatAction {
    switch (event.type) {
        case 'token':
            return { type: 'token', assistantId, text: event.text }
        case 'cleanup_proposal':
            return { type: 'proposal', assistantId, proposal: event.proposal }
        case 'error':
            return { type: 'stream_error', assistantId, message: event.message }
        case 'done':
            return { type: 'stream_done', assistantId }
    }
}

export interface UseChat {
    messages: ChatMessage[]
    isStreaming: boolean
    send: (text: string) => Promise<void>
    stop: () => void
    approve: (proposalId: string, operationIds: string[]) => Promise<void>
    reject: (proposalId: string) => Promise<void>
}

export function useChat(datasetId: string, api: DataPilotApi = defaultApi): UseChat {
    const [messages, dispatch] = useReducer(chatReducer, [] as ChatMessage[])
    const [isStreaming, setIsStreaming] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const messagesRef = useRef(messages)

    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    useEffect(() => () => abortRef.current?.abort(), [])

    const send = useCallback(
        async (text: string) => {
            const message = text.trim()
            if (message === '' || abortRef.current) return

            const assistantId = crypto.randomUUID()
            const controller = new AbortController()
            abortRef.current = controller
            setIsStreaming(true)
            const history = toHistory(messagesRef.current)
            dispatch({ type: 'user_sent', userId: crypto.randomUUID(), assistantId, text: message })

            try {
                const events = api.streamChat({ datasetId, message, history, signal: controller.signal })
                for await (const event of events) dispatch(eventToAction(assistantId, event))
                dispatch({ type: 'stream_done', assistantId })
            } catch (error) {
                dispatch(
                    isAbortError(error)
                        ? { type: 'stream_done', assistantId }
                        : { type: 'stream_error', assistantId, message: describeError(error) },
                )
            } finally {
                abortRef.current = null
                setIsStreaming(false)
            }
        },
        [api, datasetId],
    )

    const stop = useCallback(() => abortRef.current?.abort(), [])

    const resolveProposal = useCallback(
        async (proposalId: string, inFlight: ProposalStatus, action: () => Promise<CleanupResult>) => {
            dispatch({ type: 'proposal_status', proposalId, status: inFlight })
            try {
                const result = await action()
                dispatch({ type: 'proposal_status', proposalId, status: result.status, message: result.message })
            } catch (error) {
                dispatch({ type: 'proposal_status', proposalId, status: 'failed', message: describeError(error) })
            }
        },
        [],
    )

    const approve = useCallback(
        (proposalId: string, operationIds: string[]) =>
            resolveProposal(proposalId, 'applying', () =>
                api.approveCleanup(datasetId, proposalId, operationIds),
            ),
        [api, datasetId, resolveProposal],
    )

    const reject = useCallback(
        (proposalId: string) =>
            resolveProposal(proposalId, 'rejecting', () => api.rejectCleanup(datasetId, proposalId)),
        [api, datasetId, resolveProposal],
    )

    return { messages, isStreaming, send, stop, approve, reject }
}
