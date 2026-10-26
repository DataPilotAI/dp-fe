import type { CleanupPreview, PreviewRow } from '../../api/schemas'

const MAX_PREVIEW_ROWS = 10
const EMPTY_CELL_LABEL = '(empty)'

type PreviewValue = PreviewRow[string] | undefined

function formatCell(value: PreviewValue): string {
    return value === null || value === undefined ? EMPTY_CELL_LABEL : String(value)
}

interface PreviewTableProps {
    caption: string
    columns: string[]
    rows: PreviewRow[]
    compareTo?: PreviewRow[]
}

function PreviewTable({ caption, columns, rows, compareTo }: PreviewTableProps) {
    return (
        <table className="preview-table">
            <caption>{caption}</caption>
            <thead>
                <tr>
                    {columns.map((column) => (
                        <th key={column}>{column}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                        {columns.map((column) => {
                            const changed = compareTo !== undefined && compareTo[rowIndex]?.[column] !== row[column]
                            return (
                                <td key={column} className={changed ? 'cell-changed' : undefined}>
                                    {formatCell(row[column])}
                                </td>
                            )
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

interface PreviewDiffProps {
    preview: CleanupPreview
}

/** Shows sample rows before and after the cleanup, highlighting cells that change. */
export function PreviewDiff({ preview }: PreviewDiffProps) {
    return (
        <div className="preview-diff">
            <PreviewTable caption="Before" columns={preview.columns} rows={preview.before} />
            <PreviewTable
                caption="After"
                columns={preview.columns}
                rows={preview.after}
                compareTo={preview.before}
            />
        </div>
    )
}
