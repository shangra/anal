import type { DragEvent } from 'react'

export const GROUPING_DND_MIME = 'application/x-grouping-field'

export type GroupingDragPayload =
    | { source: 'available'; fields: string[] }
    | { source: 'selected'; fields: string[] }


export function readDragPayload(event: DragEvent): GroupingDragPayload | null {
    const raw = event.dataTransfer.getData(GROUPING_DND_MIME) || event.dataTransfer.getData('text/plain')
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as GroupingDragPayload & { field?: string; index?: number }
        if (parsed.source === 'available' && (!('fields' in parsed) || !Array.isArray(parsed.fields)) && typeof parsed.field === 'string') {
            return { source: 'available', fields: [parsed.field] }
        }
        if (parsed.source === 'selected' && (!('fields' in parsed) || !Array.isArray(parsed.fields)) && typeof parsed.field === 'string') {
            return { source: 'selected', fields: [parsed.field] }
        }
        if ('fields' in parsed && Array.isArray(parsed.fields) && 'source' in parsed) {
            return parsed as GroupingDragPayload
        }
        return null
    } catch {
        return null
    }
}

export function writeDragPayload(event: DragEvent, payload: GroupingDragPayload): void {
    const raw = JSON.stringify(payload)
    event.dataTransfer.setData(GROUPING_DND_MIME, raw)
    event.dataTransfer.setData('text/plain', raw)
    event.dataTransfer.effectAllowed = payload.source === 'available' ? 'copy' : 'move'
}
