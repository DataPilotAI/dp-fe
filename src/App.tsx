import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { USE_MOCK_API } from './api/config'
import type { Dataset } from './api/schemas'
import { ChatPanel } from './features/chat/ChatPanel'
import { DatasetSummary } from './features/datasets/DatasetSummary'
import { UploadPanel } from './features/datasets/UploadPanel'
import './index.css'

export default function App() {
    const [dataset, setDataset] = useState<Dataset | null>(null)

    return (
        <div className="app">
            <header className="app-header">
                <h1>DataPilot AI</h1>
                {USE_MOCK_API && <span className="badge">Demo mode: mock API</span>}
            </header>
            <main className="layout">
                <aside className="sidebar">
                    <UploadPanel onUploaded={setDataset} />
                    {dataset && <DatasetSummary dataset={dataset} />}
                </aside>
                <section className="chat-area" aria-label="Chat">
                    {dataset ? (
                        <ChatPanel key={dataset.id} dataset={dataset} />
                    ) : (
                        <p className="empty">Upload a data file to start chatting with DAI.</p>
                    )}
                </section>
            </main>
        </div>
    )
}

// Tests import App without a #root element, so only mount when the page provides one.
const rootElement = document.getElementById('root')
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <App />
        </StrictMode>,
    )
}
