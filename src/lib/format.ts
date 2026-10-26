const UNITS = ['B', 'KB', 'MB', 'GB'] as const
const BYTES_PER_UNIT = 1024

export function formatBytes(bytes: number): string {
    let value = bytes
    let unitIndex = 0
    while (value >= BYTES_PER_UNIT && unitIndex < UNITS.length - 1) {
        value /= BYTES_PER_UNIT
        unitIndex += 1
    }
    const text = unitIndex === 0 ? String(value) : value.toFixed(1)
    return `${text} ${UNITS[unitIndex]}`
}

export function fileExtension(fileName: string): string {
    const dot = fileName.lastIndexOf('.')
    return dot === -1 ? '' : fileName.slice(dot).toLowerCase()
}

const countFormat = new Intl.NumberFormat('en')

export function formatCount(count: number): string {
    return countFormat.format(count)
}
