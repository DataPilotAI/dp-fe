import { useState } from 'react'
import { formatCount } from '../../lib/format'
import type { ProposalState, ProposalStatus } from '../chat/chatState'
import { PreviewDiff } from './PreviewDiff'

interface CleanupProposalCardProps {
    state: ProposalState
    onApprove: (operationIds: string[]) => void
    onReject: () => void
}

const DECIDED: readonly ProposalStatus[] = ['applied', 'rejected']
const BUSY: readonly ProposalStatus[] = ['applying', 'rejecting']

const STATUS_LABELS: Record<ProposalStatus, string> = {
    pending: 'Waiting for your approval',
    applying: 'Applying changes…',
    applied: 'Applied',
    rejecting: 'Rejecting…',
    rejected: 'Rejected',
    failed: 'Something went wrong',
}

export function CleanupProposalCard({ state, onApprove, onReject }: CleanupProposalCardProps) {
    const { proposal, status, message } = state
    const [selected, setSelected] = useState(() => new Set(proposal.operations.map((op) => op.id)))
    const isDecided = DECIDED.includes(status)
    const isLocked = isDecided || BUSY.includes(status)

    function toggle(operationId: string) {
        setSelected((current) => {
            const next = new Set(current)
            if (!next.delete(operationId)) next.add(operationId)
            return next
        })
    }

    const approveLabel = `Approve ${selected.size} change${selected.size === 1 ? '' : 's'}`

    return (
        <article className="proposal" aria-label={`Cleanup proposal: ${proposal.title}`}>
            <header>
                <h3>{proposal.title}</h3>
                {proposal.summary && <p className="hint">{proposal.summary}</p>}
            </header>

            <fieldset disabled={isLocked}>
                <legend>Proposed changes</legend>
                <ul className="operations">
                    {proposal.operations.map((operation) => (
                        <li key={operation.id}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selected.has(operation.id)}
                                    onChange={() => toggle(operation.id)}
                                />
                                <span>
                                    {operation.description}
                                    {operation.column && <code>{operation.column}</code>}
                                    {operation.affectedRows !== undefined && (
                                        <span className="hint"> · {formatCount(operation.affectedRows)} rows</span>
                                    )}
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>
            </fieldset>

            {proposal.preview && <PreviewDiff preview={proposal.preview} />}

            <footer>
                <p role="status" className={`status status-${status}`}>
                    {STATUS_LABELS[status]}
                    {message && `: ${message}`}
                </p>
                {!isDecided && (
                    <div className="actions">
                        <button
                            type="button"
                            className="primary"
                            disabled={isLocked || selected.size === 0}
                            onClick={() => onApprove(proposal.operations.map((op) => op.id).filter((id) => selected.has(id)))}
                        >
                            {approveLabel}
                        </button>
                        <button type="button" disabled={isLocked} onClick={onReject}>
                            Reject
                        </button>
                    </div>
                )}
            </footer>
        </article>
    )
}
