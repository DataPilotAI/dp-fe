import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES } from './config'
import { validateUploadFile } from './uploadValidation'

function fileOf(name: string, size: number): File {
    return new File([new Uint8Array(size)], name)
}

describe('validateUploadFile', () => {
    it('accepts a supported file', () => {
        expect(validateUploadFile(fileOf('data.CSV', 10))).toBeNull()
        expect(validateUploadFile(fileOf('book.xlsx', 10))).toBeNull()
    })

    it.each(['data.tsv', 'old.xls', 'data.json'])('rejects %s', (name) => {
        expect(validateUploadFile(fileOf(name, 10))).toMatch(/unsupported/i)
    })

    it('rejects an empty file', () => {
        expect(validateUploadFile(fileOf('data.csv', 0))).toMatch(/empty/i)
    })

    it('rejects an oversized file', () => {
        const file = fileOf('data.csv', 1)
        Object.defineProperty(file, 'size', { value: MAX_UPLOAD_BYTES + 1 })
        expect(validateUploadFile(file)).toMatch(/larger/i)
    })

    it('rejects unsupported or missing extensions', () => {
        expect(validateUploadFile(fileOf('run.exe', 10))).toMatch(/unsupported/i)
        expect(validateUploadFile(fileOf('noextension', 10))).toMatch(/unsupported/i)
    })
})
