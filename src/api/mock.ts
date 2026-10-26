import type {
    ChatEvent,
    CleanupProposal,
    CleanupResult,
    Dataset,
    PreviewRow,
} from './schemas'
import type { DataPilotApi, StreamChatParams } from './types'

const TOKEN_DELAY_MS = 20
const ACTION_DELAY_MS = 700
const UPLOAD_STEPS = 5
const UPLOAD_STEP_DELAY_MS = 100
const CLEANUP_INTENT = /clean|fix|remove|dedup|duplicate|trim|fill|missing/i

const CLEANUP_REPLY =
    "I found a few things worth cleaning up. Here is what I'd change; review the preview and approve the changes you want applied.\n\n"

const ANSWER_REPLY =
    "Here is a quick look at your data (demo response from the mock API):\n\n" +
    '| Check | Result |\n| --- | --- |\n| Missing values | 2 cells |\n| Duplicate rows | 1 |\n| Columns | 3 |\n\n' +
    'Ask me to **clean it up** and I will propose changes for you to approve.\n'

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
        const timer = setTimeout(resolve, ms)
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(timer)
                reject(new DOMException('Aborted', 'AbortError'))
            },
            { once: true },
        )
    })
}

function sampleProposal(): CleanupProposal {
    const before: PreviewRow[] = [
        { email: ' Ann@Example.com ', name: 'Ann', age: 34 },
        { email: 'bob@example.com', name: 'Bob', age: null },
        { email: 'bob@example.com', name: 'Bob', age: null },
    ]
    const after: PreviewRow[] = [
        { email: 'ann@example.com', name: 'Ann', age: 34 },
        { email: 'bob@example.com', name: 'Bob', age: 34 },
        { email: 'bob@example.com', name: 'Bob', age: 34 },
    ]
    return {
        id: `mock-${crypto.randomUUID()}`,
        title: 'Tidy emails, remove duplicates, fill missing ages',
        summary: 'Three changes affecting 3 of 3 sample rows.',
        operations: [
            { id: 'trim', kind: 'trim_whitespace', column: 'email', description: 'Trim and lower-case emails', affectedRows: 1 },
            { id: 'dedupe', kind: 'drop_duplicates', description: 'Drop exact duplicate rows', affectedRows: 1 },
            { id: 'fill-age', kind: 'fill_missing', column: 'age', description: 'Fill missing ages with the median (34)', affectedRows: 2 },
        ],
        preview: { columns: ['email', 'name', 'age'], before, after },
    }
}

async function* mockStreamChat({ message, signal }: StreamChatParams): AsyncGenerator<ChatEvent> {
    const wantsCleanup = CLEANUP_INTENT.test(message)
    const reply = wantsCleanup ? CLEANUP_REPLY : ANSWER_REPLY

    for (const word of reply.split(/(?<=\s)/)) {
        await sleep(TOKEN_DELAY_MS, signal)
        yield { type: 'token', text: word }
    }
    if (wantsCleanup) yield { type: 'cleanup_proposal', proposal: sampleProposal() }
    yield { type: 'done' }
}

async function describeUpload(file: File): Promise<Dataset> {
    const dataset: Dataset = { id: `mock-${crypto.randomUUID()}`, name: file.name, sizeBytes: file.size }
    if (!/\.csv$/i.test(file.name)) return dataset

    const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim() !== '')
    const header = lines[0]?.split(',') ?? []
    return {
        ...dataset,
        rowCount: Math.max(lines.length - 1, 0),
        columns: header.map((name) => ({ name: name.trim() })),
    }
}

async function mockUploadDataset(
    file: File,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
): Promise<Dataset> {
    for (let step = 1; step <= UPLOAD_STEPS; step += 1) {
        await sleep(UPLOAD_STEP_DELAY_MS, signal)
        onProgress(step / UPLOAD_STEPS)
    }
    return describeUpload(file)
}

async function mockApprove(
    _datasetId: string,
    _proposalId: string,
    operationIds: string[],
    signal?: AbortSignal,
): Promise<CleanupResult> {
    await sleep(ACTION_DELAY_MS, signal)
    return {
        status: 'applied',
        message: `Applied ${operationIds.length} change(s).`,
        rowsChanged: operationIds.length,
    }
}

async function mockReject(
    _datasetId: string,
    _proposalId: string,
    signal?: AbortSignal,
): Promise<CleanupResult> {
    await sleep(ACTION_DELAY_MS, signal)
    return { status: 'rejected', message: 'No changes were made.' }
}

export const mockApi: DataPilotApi = {
    uploadDataset: mockUploadDataset,
    streamChat: mockStreamChat,
    approveCleanup: mockApprove,
    rejectCleanup: mockReject,
}
