import type { DragEvent } from 'react'

export const COLGROUP_DND_MIME = 'application/x-mdm-colgroup'

const TEXT_PLAIN = 'text/plain'

export type ColumnGroupingDragPayload =
    | { source: 'tree'; nodeIds: string[] }
    | { source: 'available-panel'; fieldIds: string[] }

interface LegacyAvailablePayload {
    source: 'available'
    fields?: string[]
    field?: string
}

export function writeGroupingDragPayload(event: DragEvent<HTMLElement>, payload: ColumnGroupingDragPayload): void {
    const raw = JSON.stringify(payload)
    event.dataTransfer.setData(COLGROUP_DND_MIME, raw)
    event.dataTransfer.setData(TEXT_PLAIN, raw)
    event.dataTransfer.effectAllowed = payload.source === 'tree' ? 'move' : 'copy'
}

export function readGroupingDragPayload(event: DragEvent<HTMLElement>): ColumnGroupingDragPayload | null {
    const raw =
        event.dataTransfer.getData(COLGROUP_DND_MIME) || event.dataTransfer.getData(TEXT_PLAIN)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as ColumnGroupingDragPayload | LegacyAvailablePayload
        if (parsed.source === 'tree' && Array.isArray((parsed as { nodeIds?: unknown }).nodeIds)) {
            return { source: 'tree', nodeIds: (parsed as { nodeIds: string[] }).nodeIds }
        }
        // Панель доступных полей пишет generic payload { source:'available', fields }.
        if (parsed.source === 'available') {
            const fields = Array.isArray(parsed.fields)
                ? (parsed.fields as string[])
                : typeof parsed.field === 'string'
                  ? [parsed.field]
                  : []
            if (fields.length > 0) return { source: 'available-panel', fieldIds: fields }
        }
        if (
            parsed.source === 'available-panel' &&
            Array.isArray((parsed as { fieldIds?: unknown }).fieldIds)
        ) {
            return {
                source: 'available-panel',
                fieldIds: (parsed as { fieldIds: string[] }).fieldIds,
            }
        }
        return null
    } catch {
        return null
    }
}