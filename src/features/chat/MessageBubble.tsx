import { Markdown } from '../../components/Markdown'
import { CleanupProposalCard } from '../cleanup/CleanupProposalCard'
import type { ChatMessage } from './chatState'

interface MessageBubbleProps {
    message: ChatMessage
    onApprove: (proposalId: string, operationIds: string[]) => void
    onReject: (proposalId: string) => void
}

export function MessageBubble({ message, onApprove, onReject }: MessageBubbleProps) {
    if (message.role === 'user') {
        return (
            <div className="message message-user">
                <p>{message.text}</p>
            </div>
        )
    }

    const isWaiting = message.streaming && message.text === ''
    return (
        <div className="message message-assistant" aria-busy={message.streaming}>
            {isWaiting && <p className="hint">DAI is thinking…</p>}
            {message.text !== '' && <Markdown>{message.text}</Markdown>}
            {message.streaming && message.text !== '' && <span className="caret" aria-hidden="true" />}

            {message.proposals.map((state) => (
                <CleanupProposalCard
                    key={state.proposal.id}
                    state={state}
                    onApprove={(operationIds) => onApprove(state.proposal.id, operationIds)}
                    onReject={() => onReject(state.proposal.id)}
                />
            ))}

            {message.error && (
                <p role="alert" className="error">
                    {message.error}
                </p>
            )}
        </div>
    )
}
