import React, { type MouseEvent, type ReactNode } from 'react'
import type { ModalDialogProps } from './types'

export class ModalDialog extends React.Component<ModalDialogProps> {
    handleOverlayClick = (): void => {
        this.props.onClose()
    }

    handleDialogClick = (event: MouseEvent): void => {
        event.stopPropagation()
    }

    render(): ReactNode {
        const { open, children, embedded } = this.props
        if (!open) return null

        if (embedded) {
            return (
                <div
                    className="settings-container embedded"
                    style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
                >
                    {children}
                </div>
            )
        }

        return (
            <div className="settings-overlay" role="presentation" onClick={this.handleOverlayClick}>
                <div
                    className="settings-container"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-modal-title"
                    tabIndex={-1}
                    onClick={this.handleDialogClick}
                >
                    {children}
                </div>
            </div>
        )
    }
}
