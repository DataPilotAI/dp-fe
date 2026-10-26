import { uploadForm } from '../lib/http'
import { endpoints } from './endpoints'
import { datasetSchema } from './schemas'
import type { Dataset } from './schemas'

const UPLOAD_FIELD_NAME = 'file'

/** Uploads one file as multipart form data and reports progress from 0 to 1. */
export function uploadDataset(
    file: File,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
): Promise<Dataset> {
    const body = new FormData()
    body.append(UPLOAD_FIELD_NAME, file)
    return uploadForm({ url: endpoints.datasets(), body, schema: datasetSchema, onProgress, signal })
}
