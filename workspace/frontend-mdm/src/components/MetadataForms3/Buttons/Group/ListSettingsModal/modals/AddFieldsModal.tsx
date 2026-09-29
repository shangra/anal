import { type ReactNode } from 'react'
import type { AddFieldsModalProps } from './types'

export function AddFieldsModal({ open, title, onClose, children }: AddFieldsModalProps): ReactNode {
    if (!open) return null

    return (
        <div className="grouping-add-overlay" role="presentation" onClick={onClose}>
            <div
                className="grouping-add-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-modal-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="grouping-add-modal__header">
                    <h3 id="add-modal-title" className="grouping-add-modal__title">
                        {title}
                    </h3>
                    <button
                        type="button"
                        className="grouping-add-modal__close"
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </header>
                <div className="grouping-add-modal__body">
                    {children}
                </div>
                <footer className="grouping-add-modal__footer">
                    <button type="button" className="action-button" onClick={onClose}>
                        Закрыть
                    </button>
                </footer>
            </div>
        </div>
    )
}
