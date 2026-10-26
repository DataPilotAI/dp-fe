import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CleanupProposal } from '../../api/schemas'
import type { ProposalState } from '../chat/chatState'
import { CleanupProposalCard } from './CleanupProposalCard'

const proposal: CleanupProposal = {
    id: 'p1',
    title: 'Tidy emails',
    summary: 'Two fixes',
    operations: [
        { id: 'o1', kind: 'trim', column: 'email', description: 'Trim whitespace', affectedRows: 1200 },
        { id: 'o2', kind: 'dedupe', description: 'Remove duplicates' },
    ],
    preview: {
        columns: ['email'],
        before: [{ email: ' a@x.com ' }, { email: 'b@x.com' }],
        after: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
    },
}

function renderCard(state: Partial<ProposalState> = {}) {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    render(
        <CleanupProposalCard
            state={{ proposal, status: 'pending', ...state }}
            onApprove={onApprove}
            onReject={onReject}
        />,
    )
    return { onApprove, onReject }
}

describe('CleanupProposalCard', () => {
    it('lists operations and the before/after preview', () => {
        renderCard()
        expect(screen.getByText('Tidy emails')).toBeInTheDocument()
        expect(screen.getByLabelText(/Trim whitespace/)).toBeChecked()
        expect(screen.getByText(/1,200 rows/)).toBeInTheDocument()
        expect(screen.getByRole('table', { name: 'Before' })).toBeInTheDocument()
        expect(screen.getByRole('table', { name: 'After' })).toBeInTheDocument()
    })

    it('approves every operation by default', async () => {
        const { onApprove } = renderCard()
        await userEvent.click(screen.getByRole('button', { name: 'Approve 2 changes' }))
        expect(onApprove).toHaveBeenCalledWith(['o1', 'o2'])
    })

    it('approves only the operations that stay selected', async () => {
        const { onApprove } = renderCard()
        await userEvent.click(screen.getByLabelText(/Remove duplicates/))
        await userEvent.click(screen.getByRole('button', { name: 'Approve 1 change' }))
        expect(onApprove).toHaveBeenCalledWith(['o1'])
    })

    it('disables approval when nothing is selected', async () => {
        renderCard()
        await userEvent.click(screen.getByLabelText(/Trim whitespace/))
        await userEvent.click(screen.getByLabelText(/Remove duplicates/))
        expect(screen.getByRole('button', { name: 'Approve 0 changes' })).toBeDisabled()
    })

    it('calls onReject', async () => {
        const { onReject } = renderCard()
        await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
        expect(onReject).toHaveBeenCalledOnce()
    })

    it('hides the actions once decided', () => {
        renderCard({ status: 'applied', message: 'ok' })
        expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent('Applied: ok')
    })

    it('locks the actions while a request is in flight', () => {
        renderCard({ status: 'applying' })
        expect(screen.getByRole('button', { name: /Approve/ })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled()
    })

    it('allows retrying after a failure', () => {
        renderCard({ status: 'failed', message: 'Server error' })
        expect(screen.getByRole('button', { name: /Approve/ })).toBeEnabled()
        expect(screen.getByRole('status')).toHaveTextContent('Server error')
    })
})
