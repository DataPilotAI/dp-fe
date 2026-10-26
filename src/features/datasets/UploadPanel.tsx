import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { api } from '../../api'
import { ALLOWED_EXTENSIONS } from '../../api/config'
import { validateUploadFile } from '../../api/uploadValidation'
import { describeError, isAbortError } from '../../lib/http'
import type { Dataset } from '../../api/schemas'

interface UploadPanelProps {
    onUploaded: (dataset: Dataset) => void
}

const PERCENT = 100

export function UploadPanel({ onUploaded }: UploadPanelProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const controllerRef = useRef<AbortController | null>(null)
    const [progress, setProgress] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const isUploading = progress !== null

    async function upload(file: File) {
        const problem = validateUploadFile(file)
        if (problem) return setError(problem)

        const controller = new AbortController()
        controllerRef.current = controller
        setError(null)
        setProgress(0)
        try {
            onUploaded(await api.uploadDataset(file, setProgress, controller.signal))
        } catch (uploadError) {
            if (!isAbortError(uploadError)) setError(describeError(uploadError))
        } finally {
            controllerRef.current = null
            setProgress(null)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files[0]
        if (file && !isUploading) void upload(file)
    }

    return (
        <section className="panel" aria-labelledby="upload-title">
            <h2 id="upload-title">Upload</h2>
            <div
                className={`dropzone${isDragging ? ' dropzone-active' : ''}`}
                onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <p>Drag a file here or</p>
                <button type="button" disabled={isUploading} onClick={() => inputRef.current?.click()}>
                    Choose file
                </button>
                <p className="hint">{ALLOWED_EXTENSIONS.join(' ')}</p>
                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    accept={ALLOWED_EXTENSIONS.join(',')}
                    aria-label="Data file"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void upload(file)
                    }}
                />
            </div>

            {isUploading && (
                <div className="progress-row">
                    <progress value={progress} max={1} aria-label="Upload progress" />
                    <span>{Math.round(progress * PERCENT)}%</span>
                    <button type="button" className="link" onClick={() => controllerRef.current?.abort()}>
                        Cancel
                    </button>
                </div>
            )}
            {error && (
                <p role="alert" className="error">
                    {error}
                </p>
            )}
        </section>
    )
}
