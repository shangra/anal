import cn from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon, IconButton, Typography } from 'ui-kit';

import styles from './styles.module.css';

type Position = 'left' | 'right' | 'top' | 'bottom';

interface DrawerProps {
    /** Заголовок */
    title?: string;
    /** Флаг открытости для controlled режима */
    open?: boolean;
    /** Колбэк изменения для controlled режима */
    onOpenChange?: (open: boolean) => void;
    /** Начальное состояние для uncontrolled режима */
    defaultOpen?: boolean;
    position?: Position;
    children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({
    title,
    open: openProp,
    onOpenChange,
    defaultOpen = false,
    position = 'left',
    children,
}) => {
    const isControlled = openProp !== undefined;
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isOpen = isControlled ? openProp : internalOpen;

    const setOpen = (nextOpen: boolean) => {
        if (isControlled) {
            onOpenChange?.(nextOpen);
        } else {
            setInternalOpen(nextOpen);
            onOpenChange?.(nextOpen); // опциональное уведомление
        }
    };

    // Размер в пикселях (ширина или высота), изначально 40%
    const [size, setSize] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const isHorizontal = position === 'left' || position === 'right';
        return isHorizontal ? window.innerWidth * 0.6 : window.innerHeight * 0.6;
    });

    // Корректируем размер при открытии
    useEffect(() => {
        if (!isOpen) return;
        const isHorizontal = position === 'left' || position === 'right';
        const maxSize = isHorizontal ? window.innerWidth * 0.9 : window.innerHeight * 0.9;
        setSize((prev) => Math.min(prev, maxSize));
    }, [position, isOpen]);

    // ---------- Ресайз ----------
    const [isResizing, setIsResizing] = useState(false);
    const startResize = useRef({ x: 0, y: 0, startSize: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isOpen) return;
        e.preventDefault();
        startResize.current = {
            x: e.clientX,
            y: e.clientY,
            startSize: size,
        };
        setIsResizing(true);
    };

    useEffect(() => {
        if (!isResizing) return;
        const isHorizontal = position === 'left' || position === 'right';
        const maxSize = isHorizontal ? window.innerWidth * 0.9 : window.innerHeight * 0.9;

        const updateSize = (clientX: number, clientY: number) => {
            let delta = 0;
            if (position === 'left') {
                delta = clientX - startResize.current.x;
            } else if (position === 'right') {
                delta = startResize.current.x - clientX;
            } else if (position === 'top') {
                delta = clientY - startResize.current.y;
            } else if (position === 'bottom') {
                delta = startResize.current.y - clientY;
            }
            const newSize = Math.max(100, Math.min(startResize.current.startSize + delta, maxSize));
            setSize(newSize);
        };

        const handleMouseMove = (e: MouseEvent) => updateSize(e.clientX, e.clientY);
        const stopResize = () => setIsResizing(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);

        // eslint-disable-next-line consistent-return
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
        };
    }, [isResizing, position]);

    // Закрытие по Escape (только когда открыто)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line consistent-return
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isControlled, onOpenChange]); // setOpen не меняется, но зависит от isControlled и onOpenChange

    return (
        <>
            <div
                className={styles.overlay}
                style={{
                    display: isOpen ? undefined : 'none',
                }}
                onClick={() => setOpen(false)}
            />
            <div
                className={cn(styles.drawer, styles[`drawer__${position}`])}
                style={{
                    ...(position === 'left' && { width: size }),
                    ...(position === 'right' && { width: size }),
                    ...(position === 'top' && { height: size }),
                    ...(position === 'bottom' && { height: size }),
                    display: isOpen ? undefined : 'none',
                }}
                role="dialog"
                aria-modal={isOpen ? 'true' : undefined}
                aria-hidden={!isOpen}
            >
                <div className={styles.handle} onMouseDown={handleMouseDown} />
                <div className={styles.drawer__content_wrapper}>
                    <div className={styles.drawer__header}>
                        {title && (
                            <Typography variant="heading5" color="primary">
                                {title}
                            </Typography>
                        )}
                        <IconButton icon={CloseIcon} variant="text" color="secondary" onClick={() => setOpen(false)} />
                    </div>
                    <div className={styles.drawer__content}>{children}</div>
                </div>
            </div>
        </>
    );
};

export default Drawer;
