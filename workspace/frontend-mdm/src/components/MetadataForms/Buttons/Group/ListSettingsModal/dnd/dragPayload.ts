import type { DragEvent } from 'react'

const TEXT_PLAIN = 'text/plain'

export function readDragPayload<T>(event: DragEvent, mime: string): T | null {
    const raw = event.dataTransfer.getData(mime) || event.dataTransfer.getData(TEXT_PLAIN)
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as T
        return parsed
    } catch {
        return null
    }
}

export function writeDragPayload<T>(event: DragEvent, mime: string, data: T): void {
    const raw = JSON.stringify(data)
    event.dataTransfer.setData(mime, raw)
    event.dataTransfer.setData(TEXT_PLAIN, raw)
}
