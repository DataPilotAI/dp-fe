import type { CleanupProposal } from '../../api/schemas'

export type ProposalStatus =
    | 'pending'
    | 'applying'
    | 'applied'
    | 'rejecting'
    | 'rejected'
    | 'failed'

export interface ProposalState {
    proposal: CleanupProposal
    status: ProposalStatus
    message?: string
}

export interface UserMessage {
    id: string
    role: 'user'
    text: string
}

export interface AssistantMessage {
    id: string
    role: 'assistant'
    text: string
    proposals: ProposalState[]
    streaming: boolean
    error?: string
}

export type ChatMessage = UserMessage | AssistantMessage

export type ChatAction =
    | { type: 'user_sent'; userId: string; assistantId: string; text: string }
    | { type: 'token'; assistantId: string; text: string }
    | { type: 'proposal'; assistantId: string; proposal: CleanupProposal }
    | { type: 'stream_error'; assistantId: string; message: string }
    | { type: 'stream_done'; assistantId: string }
    | { type: 'proposal_status'; proposalId: string; status: ProposalStatus; message?: string }

function updateAssistant(
    messages: ChatMessage[],
    assistantId: string,
    update: (message: AssistantMessage) => AssistantMessage,
): ChatMessage[] {
    return messages.map((message) =>
        message.role === 'assistant' && message.id === assistantId ? update(message) : message,
    )
}

function updateProposal(
    messages: ChatMessage[],
    proposalId: string,
    status: ProposalStatus,
    message: string | undefined,
): ChatMessage[] {
    return messages.map((entry) => {
        if (entry.role !== 'assistant') return entry
        const proposals = entry.proposals.map((state) =>
            state.proposal.id === proposalId ? { ...state, status, message } : state,
        )
        return { ...entry, proposals }
    })
}

export function chatReducer(messages: ChatMessage[], action: ChatAction): ChatMessage[] {
    switch (action.type) {
        case 'user_sent':
            return [
                ...messages,
                { id: action.userId, role: 'user', text: action.text },
                { id: action.assistantId, role: 'assistant', text: '', proposals: [], streaming: true },
            ]
        case 'token':
            return updateAssistant(messages, action.assistantId, (message) => ({
                ...message,
                text: message.text + action.text,
            }))
        case 'proposal':
            return updateAssistant(messages, action.assistantId, (message) => ({
                ...message,
                proposals: [...message.proposals, { proposal: action.proposal, status: 'pending' }],
            }))
        case 'stream_error':
            return updateAssistant(messages, action.assistantId, (message) => ({
                ...message,
                streaming: false,
                error: action.message,
            }))
        case 'stream_done':
            return updateAssistant(messages, action.assistantId, (message) => ({
                ...message,
                streaming: false,
            }))
        case 'proposal_status':
            return updateProposal(messages, action.proposalId, action.status, action.message)
    }
}
