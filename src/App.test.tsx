import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DataPilotApi } from './api/types'

const proposal = {
    id: 'p1',
    title: 'Tidy emails',
    operations: [{ id: 'o1', kind: 'trim', description: 'Trim whitespace' }],
}

vi.mock('./api', () => {
    const api: DataPilotApi = {
        uploadDataset: async (file, onProgress) => {
            onProgress(1)
            return { id: 'd1', name: file.name, sizeBytes: file.size, rowCount: 3 }
        },
        streamChat: async function* () {
            yield { type: 'token', text: 'Here is a **plan**.' }
            yield { type: 'cleanup_proposal', proposal }
            yield { type: 'done' }
        },
        approveCleanup: async () => ({ status: 'applied', message: 'All set' }),
        rejectCleanup: async () => ({ status: 'rejected' }),
    }
    return { api }
})

const { default: App } = await import('./App')

describe('App', () => {
    it('uploads a file, streams a reply and applies an approved cleanup', async () => {
        const user = userEvent.setup()
        render(<App />)
        expect(screen.getByText(/Upload a data file/)).toBeInTheDocument()

        await user.upload(screen.getByLabelText('Data file'), new File(['a,b\n1,2'], 'people.csv'))
        expect(await screen.findByText('people.csv')).toBeInTheDocument()

        await user.type(screen.getByLabelText('Message DAI'), 'clean it up{Enter}')
        expect(await screen.findByText('plan')).toBeInTheDocument()
        expect(await screen.findByText('Tidy emails')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Approve 1 change' }))
        expect(await screen.findByText(/Applied: All set/)).toBeInTheDocument()
    })

    it('shows an error for an unsupported file', async () => {
        const user = userEvent.setup({ applyAccept: false })
        render(<App />)

        await user.upload(screen.getByLabelText('Data file'), new File(['x'], 'virus.exe'))

        expect(await screen.findByRole('alert')).toHaveTextContent(/Unsupported file type/)
    })
})
