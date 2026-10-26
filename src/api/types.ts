import type { ChatEvent, CleanupResult, Dataset } from './schemas'

export interface ChatTurn {
    role: 'user' | 'assistant'
    content: string
}

export interface StreamChatParams {
    datasetId: string
    message: string
    history: ChatTurn[]
    signal: AbortSignal
}

export interface DataPilotApi {
    uploadDataset(
        file: File,
        onProgress: (fraction: number) => void,
        signal?: AbortSignal,
    ): Promise<Dataset>
    streamChat(params: StreamChatParams): AsyncIterable<ChatEvent>
    approveCleanup(
        datasetId: string,
        proposalId: string,
        operationIds: string[],
        signal?: AbortSignal,
    ): Promise<CleanupResult>
    rejectCleanup(datasetId: string, proposalId: string, signal?: AbortSignal): Promise<CleanupResult>
}
