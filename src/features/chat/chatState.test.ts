import { describe, expect, it } from 'vitest'
import type { CleanupProposal } from '../../api/schemas'
import { chatReducer } from './chatState'
import type { AssistantMessage, ChatMessage } from './chatState'

const proposal: CleanupProposal = {
    id: 'p1',
    title: 'Fix emails',
    operations: [{ id: 'o1', kind: 'trim', description: 'Trim whitespace' }],
}

function started(): ChatMessage[] {
    return chatReducer([], { type: 'user_sent', userId: 'u1', assistantId: 'a1', text: 'hello' })
}

function assistantOf(messages: ChatMessage[]): AssistantMessage {
    const message = messages.find((entry) => entry.role === 'assistant')
    if (!message || message.role !== 'assistant') throw new Error('no assistant message')
    return message
}

describe('chatReducer', () => {
    it('adds the user message and an empty streaming reply', () => {
        const messages = started()
        expect(messages).toHaveLength(2)
        expect(messages[0]).toMatchObject({ role: 'user', text: 'hello' })
        expect(assistantOf(messages)).toMatchObject({ text: '', streaming: true, proposals: [] })
    })

    it('appends tokens to the matching reply only', () => {
        let messages = started()
        messages = chatReducer(messages, { type: 'token', assistantId: 'a1', text: 'Hel' })
        messages = chatReducer(messages, { type: 'token', assistantId: 'a1', text: 'lo' })
        messages = chatReducer(messages, { type: 'token', assistantId: 'other', text: 'x' })
        expect(assistantOf(messages).text).toBe('Hello')
    })

    it('attaches a proposal as pending', () => {
        const messages = chatReducer(started(), { type: 'proposal', assistantId: 'a1', proposal })
        expect(assistantOf(messages).proposals).toEqual([{ proposal, status: 'pending' }])
    })

    it('records errors and stops streaming', () => {
        const messages = chatReducer(started(), { type: 'stream_error', assistantId: 'a1', message: 'boom' })
        expect(assistantOf(messages)).toMatchObject({ streaming: false, error: 'boom' })
    })

    it('stops streaming when done', () => {
        const messages = chatReducer(started(), { type: 'stream_done', assistantId: 'a1' })
        expect(assistantOf(messages).streaming).toBe(false)
    })

    it('updates the status and message of one proposal', () => {
        let messages = chatReducer(started(), { type: 'proposal', assistantId: 'a1', proposal })
        messages = chatReducer(messages, {
            type: 'proposal_status',
            proposalId: 'p1',
            status: 'applied',
            message: '12 rows',
        })
        expect(assistantOf(messages).proposals[0]).toMatchObject({ status: 'applied', message: '12 rows' })
    })

    it('does not mutate previous state', () => {
        const before = started()
        chatReducer(before, { type: 'token', assistantId: 'a1', text: 'x' })
        expect(assistantOf(before).text).toBe('')
    })
})
