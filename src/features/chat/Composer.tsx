import { useState } from 'react'
import type { KeyboardEvent } from 'react'

interface ComposerProps {
    isStreaming: boolean
    onSend: (text: string) => void
    onStop: () => void
}

const MAX_MESSAGE_LENGTH = 4000

export function Composer({ isStreaming, onSend, onStop }: ComposerProps) {
    const [text, setText] = useState('')
    const canSend = text.trim() !== '' && !isStreaming

    function submit() {
        if (!canSend) return
        onSend(text)
        setText('')
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
        }
    }

    return (
        <form
            className="composer"
            onSubmit={(event) => {
                event.preventDefault()
                submit()
            }}
        >
            <textarea
                value={text}
                rows={2}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Ask DAI about your data, or ask it to clean something up"
                aria-label="Message DAI"
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleKeyDown}
            />
            {isStreaming ? (
                <button type="button" onClick={onStop}>
                    Stop
                </button>
            ) : (
                <button type="submit" className="primary" disabled={!canSend}>
                    Send
                </button>
            )}
        </form>
    )
}
