import { useEffect, useRef } from 'react'
import type { Dataset } from '../../api/schemas'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'
import { useChat } from './useChat'

interface ChatPanelProps {
    dataset: Dataset
}

const SUGGESTIONS = [
    'Summarize this dataset',
    'Find and fix duplicate rows',
    'Trim whitespace and fill missing values',
]

export function ChatPanel({ dataset }: ChatPanelProps) {
    const { messages, isStreaming, send, stop, approve, reject } = useChat(dataset.id)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView?.({ block: 'end' })
    }, [messages])

    return (
        <div className="chat">
            <div className="messages" role="log" aria-live="polite" aria-label="Conversation with DAI">
                {messages.length === 0 && (
                    <div className="empty">
                        <p>Ask DAI about {dataset.name}.</p>
                        <ul className="chips">
                            {SUGGESTIONS.map((suggestion) => (
                                <li key={suggestion}>
                                    <button type="button" onClick={() => void send(suggestion)}>
                                        {suggestion}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        onApprove={(proposalId, operationIds) => void approve(proposalId, operationIds)}
                        onReject={(proposalId) => void reject(proposalId)}
                    />
                ))}
                <div ref={bottomRef} />
            </div>
            <Composer isStreaming={isStreaming} onSend={(text) => void send(text)} onStop={stop} />
        </div>
    )
}
