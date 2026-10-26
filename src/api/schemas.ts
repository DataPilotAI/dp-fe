import { z } from 'zod'

export const columnSchema = z.object({
    name: z.string(),
    type: z.string().optional(),
})

export const datasetSchema = z.object({
    id: z.string().min(1),
    name: z.string(),
    sizeBytes: z.number().int().nonnegative(),
    rowCount: z.number().int().nonnegative().optional(),
    columns: z.array(columnSchema).optional(),
})

const cellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const rowSchema = z.record(z.string(), cellSchema)

export const cleanupOperationSchema = z.object({
    id: z.string().min(1),
    kind: z.string(),
    column: z.string().optional(),
    description: z.string(),
    affectedRows: z.number().int().nonnegative().optional(),
})

export const cleanupPreviewSchema = z.object({
    columns: z.array(z.string()),
    before: z.array(rowSchema),
    after: z.array(rowSchema),
})

export const cleanupProposalSchema = z.object({
    id: z.string().min(1),
    title: z.string(),
    summary: z.string().optional(),
    operations: z.array(cleanupOperationSchema).min(1),
    preview: cleanupPreviewSchema.optional(),
})

export const cleanupResultSchema = z.object({
    status: z.enum(['applied', 'rejected']),
    message: z.string().optional(),
    rowsChanged: z.number().int().nonnegative().optional(),
})

export const chatEventSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('token'), text: z.string() }),
    z.object({ type: z.literal('cleanup_proposal'), proposal: cleanupProposalSchema }),
    z.object({ type: z.literal('error'), message: z.string() }),
    z.object({ type: z.literal('done') }),
])

export type Dataset = z.infer<typeof datasetSchema>
export type CleanupOperation = z.infer<typeof cleanupOperationSchema>
export type CleanupPreview = z.infer<typeof cleanupPreviewSchema>
export type CleanupProposal = z.infer<typeof cleanupProposalSchema>
export type CleanupResult = z.infer<typeof cleanupResultSchema>
export type ChatEvent = z.infer<typeof chatEventSchema>
export type PreviewRow = z.infer<typeof rowSchema>
