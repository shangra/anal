import { type ReactNode } from 'react'

export interface AddFieldsModalProps {
    open: boolean
    title: string
    onClose: () => void
    children: ReactNode
}

export interface ModalDialogProps {
    open: boolean
    onClose: () => void
    children: ReactNode
    embedded?: boolean
}
