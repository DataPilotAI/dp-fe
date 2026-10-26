import type { Dataset } from '../../api/schemas'
import { formatBytes, formatCount } from '../../lib/format'

interface DatasetSummaryProps {
    dataset: Dataset
}

export function DatasetSummary({ dataset }: DatasetSummaryProps) {
    return (
        <section className="panel" aria-labelledby="dataset-title">
            <h2 id="dataset-title">Active dataset</h2>
            <p className="dataset-name">{dataset.name}</p>
            <p className="hint">
                {formatBytes(dataset.sizeBytes)}
                {dataset.rowCount !== undefined && ` · ${formatCount(dataset.rowCount)} rows`}
            </p>
            {dataset.columns && dataset.columns.length > 0 && (
                <ul className="chips" aria-label="Columns">
                    {dataset.columns.map((column) => (
                        <li key={column.name}>{column.name}</li>
                    ))}
                </ul>
            )}
        </section>
    )
}
