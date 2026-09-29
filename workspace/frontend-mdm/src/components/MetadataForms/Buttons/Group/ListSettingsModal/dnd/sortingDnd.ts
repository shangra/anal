import type { DragEvent } from 'react'

export const SORTING_DND_MIME = 'application/x-sorting-field'

export type SortingFieldItem = {
    field: string
    label: string
    direction: 'asc' | 'desc'
}

export type SortingDragPayload = {
    source: 'available' | 'sort'
    fields: string[] | SortingFieldItem[]
}

export function writeSortingDragPayload(event: DragEvent<HTMLElement>, payload: SortingDragPayload): void {
    event.dataTransfer.setData(SORTING_DND_MIME, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'copyMove'
}

export function readSortingDragPayload(event: DragEvent<HTMLElement>): SortingDragPayload | null {
    try {
        const data = event.dataTransfer.getData(SORTING_DND_MIME)
        if (!data) return null
        return JSON.parse(data) as SortingDragPayload
    } catch {
        return null
    }
}
