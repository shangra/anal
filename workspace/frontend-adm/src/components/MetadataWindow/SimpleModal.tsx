import { FC, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './md-window.module.css';
import { CloseIcon } from 'ui-kit';

interface SimpleModalProps {
    opened: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
}

export const SimpleModal: FC<SimpleModalProps> = ({ opened, onClose, children, title }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!opened) return undefined;

        const handleMouseDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKey);
        };
    }, [opened, onClose]);

    if (!opened) return null;

    return createPortal(
        <div ref={ref} className={styles.modal}>
            <CloseIcon className={styles.close} onClick={onClose} />
            {title && <h2 className={styles.title}>{title}</h2>}
            {children}
        </div>,
        document.body,
    );
};
