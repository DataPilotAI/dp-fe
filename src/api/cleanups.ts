import { jsonPost, requestJson } from '../lib/http'
import { endpoints } from './endpoints'
import { cleanupResultSchema } from './schemas'
import type { CleanupResult } from './schemas'

export function approveCleanup(
    datasetId: string,
    proposalId: string,
    operationIds: string[],
    signal?: AbortSignal,
): Promise<CleanupResult> {
    return requestJson(
        endpoints.cleanup(datasetId, proposalId, 'approve'),
        jsonPost({ operationIds }, signal),
        cleanupResultSchema,
    )
}

export function rejectCleanup(
    datasetId: string,
    proposalId: string,
    signal?: AbortSignal,
): Promise<CleanupResult> {
    return requestJson(
        endpoints.cleanup(datasetId, proposalId, 'reject'),
        jsonPost({}, signal),
        cleanupResultSchema,
    )
}
