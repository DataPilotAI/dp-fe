import { streamChat } from './chat'
import { USE_MOCK_API } from './config'
import { approveCleanup, rejectCleanup } from './cleanups'
import { uploadDataset } from './datasets'
import { mockApi } from './mock'
import type { DataPilotApi } from './types'

const realApi: DataPilotApi = { uploadDataset, streamChat, approveCleanup, rejectCleanup }

export const api: DataPilotApi = USE_MOCK_API ? mockApi : realApi
