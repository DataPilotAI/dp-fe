import { describe, expect, it } from 'vitest'
import { fileExtension, formatBytes, formatCount } from './format'

describe('formatBytes', () => {
    it.each([
        [0, '0 B'],
        [1023, '1023 B'],
        [1024, '1.0 KB'],
        [1536, '1.5 KB'],
        [5 * 1024 * 1024, '5.0 MB'],
        [1024 ** 4, '1024.0 GB'],
    ])('formats %d as %s', (bytes, expected) => {
        expect(formatBytes(bytes)).toBe(expected)
    })
})

describe('fileExtension', () => {
    it('lowercases the last extension', () => {
        expect(fileExtension('Report.final.XLSX')).toBe('.xlsx')
    })

    it('returns an empty string when there is no extension', () => {
        expect(fileExtension('README')).toBe('')
    })
})

describe('formatCount', () => {
    it('adds thousands separators', () => {
        expect(formatCount(1234567)).toBe('1,234,567')
    })
})
