import { API_BASE_URL } from './config'

function datasetUrl(datasetId: string): string {
    return `${API_BASE_URL}/datasets/${encodeURIComponent(datasetId)}`
}

export type CleanupAction = 'approve' | 'reject'

export const endpoints = {
    datasets: () => `${API_BASE_URL}/datasets`,
    chat: (datasetId: string) => `${datasetUrl(datasetId)}/chat`,
    cleanup: (datasetId: string, proposalId: string, action: CleanupAction) =>
        `${datasetUrl(datasetId)}/cleanups/${encodeURIComponent(proposalId)}/${action}`,
}
