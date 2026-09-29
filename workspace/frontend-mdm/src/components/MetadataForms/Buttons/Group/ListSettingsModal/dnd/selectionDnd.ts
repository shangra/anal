import type { DragEvent } from 'react'

export const SELECTION_DND_MIME = 'application/x-selection-condition'

export type SelectionDragPayload = { ids: string[] }


export function readSelectionDragPayload(event: DragEvent): SelectionDragPayload | null {
    const raw = event.dataTransfer.getData(SELECTION_DND_MIME) || event.dataTransfer.getData('text/plain')
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as SelectionDragPayload
        if (Array.isArray(parsed.ids)) {
            return parsed
        }
        return null
    } catch {
        return null
    }
}

export function writeSelectionDragPayload(event: DragEvent, ids: string[] | Set<string>): void {
    const idArray = Array.isArray(ids) ? ids : Array.from(ids)
    const raw = JSON.stringify({ ids: idArray })
    event.dataTransfer.setData(SELECTION_DND_MIME, raw)
    event.dataTransfer.setData('text/plain', raw)
    event.dataTransfer.effectAllowed = 'move'
}
