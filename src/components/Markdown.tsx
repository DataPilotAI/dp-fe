import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownProps {
    children: string
}

// react-markdown does not render raw HTML and sanitises link URLs. Keep it that way:
// model output is untrusted, so never switch this to innerHTML or enable raw HTML.
export function Markdown({ children }: MarkdownProps) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            }}
        >
            {children}
        </ReactMarkdown>
    )
}
