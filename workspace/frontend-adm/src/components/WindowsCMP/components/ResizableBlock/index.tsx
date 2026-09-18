import React, {
    CSSProperties,
    FC,
    MouseEvent,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { PanelPosition } from 'components/WindowsCMP/interfaces';

interface ResizableBlockProps {
    // id блока (их может быть несколько одновременно)
    id: string;
    // Содержимое для реcайза
    children: ReactNode;
    // Положение блока
    position: PanelPosition;
    // Скрыт блок или нет
    isHidden?: boolean;
    // Начальный размер (ширина/высота в зависимости от положения блока)
    initialSize?: number;
    minSize?: number;
    maxSize?: number;
}

const MIN_WIDTH = 200;
const INITIAL_SIZE = 300;
const MAX_WIDTH = 1000;
const STORAGE_KEY_PREFIX = 'resizable-width-';

/**
 * Компонент-обёртка для ресайза содержимого с сохранением размеров в localStorage.
 * @description Может быть горизонтальным или вертикальным. Поддерживает изменения размера в одном направлении
 * (либо горизонтально, либо вертикально).
 */
export const ResizableBlock: FC<ResizableBlockProps> = (props) => {
    const {
        id,
        children,
        isHidden,
        initialSize = INITIAL_SIZE,
        minSize = MIN_WIDTH,
        maxSize = MAX_WIDTH,
        position,
    } = props;

    const localStorageKey = `${STORAGE_KEY_PREFIX}${id}_${position}`;

    /** Текущий размер блока */
    const [size, setSize] = useState<number>(() => {
        const savedSize: string | null = localStorage.getItem(localStorageKey);
        const parsedSize = savedSize ? parseInt(savedSize, 10) : initialSize;
        // Ограничить размер минимальным и максимальным значением
        return Math.max(minSize, Math.min(parsedSize, maxSize));
    });
    const [isResizing, setIsResizing] = useState<boolean>(false);
    /** Координата, от которой начинается изменение размера блока */
    const [startCoordinate, setStartCoordinate] = useState<number>(0);

    const blockRef = useRef<HTMLDivElement>(null);

    /** Обновление значения размера блока при изменении размера и ключа (положение блока) */
    useEffect(() => {
        const savedSize: string | null = localStorage.getItem(localStorageKey);
        if (savedSize !== `${size}`) {
            localStorage.setItem(localStorageKey, `${size}`);
        }
    }, [size]);

    /** Обновление размера блока при изменении позиционирования */
    useEffect(() => {
        const savedSize: string | null = localStorage.getItem(localStorageKey);
        const parsedSize = savedSize ? parseInt(savedSize, 10) : initialSize;
        // Ограничить размер минимальным и максимальным значением
        setSize(Math.max(minSize, Math.min(parsedSize, maxSize)));
    }, [position, initialSize, minSize, maxSize, localStorageKey]);

    /** Получить стиль курсора в зависимости от позиции блока */
    const getCursorStyle = useCallback(() => {
        switch (position) {
            case PanelPosition.left:
                return 'e-resize';
            case PanelPosition.right:
                return 'w-resize';
            case PanelPosition.bottom:
                return 'n-resize';
            default:
                return 'auto';
        }
    }, [position]);

    /**
     * Обработчик начала изменения размера блока
     * @param {MouseEvent} e - событие мыши
     */
    const onMouseDown = useCallback(
        (e: MouseEvent) => {
            setIsResizing(true);

            // Запомнить начальную позицию курсора
            setStartCoordinate(
                position === PanelPosition.bottom ? e.clientY : e.clientX
            );

            document.body.style.cursor = getCursorStyle();
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';
        },
        [position, getCursorStyle]
    );

    /**
     * Обработчик движения мыши при изменении размера блока
     * @param {DocumentEventMap['mousemove']} e - событие мыши
     */
    const onMouseMove = useCallback(
        (e: DocumentEventMap['mousemove']) => {
            if (!isResizing) return;

            // Текущая позиция курсора
            const coordinate =
                position === PanelPosition.bottom ? e.clientY : e.clientX;

            // Разница относительно начальной позиции
            const delta = coordinate - startCoordinate;
            let newSize = size;

            // Вычислить новый размер в зависимости от расположения блока
            switch (position) {
                case PanelPosition.left:
                    newSize += delta; // увеличить ширину блока вправо
                    break;

                case PanelPosition.right:
                    newSize -= delta; // уменьшить ширину блока влево
                    break;

                case PanelPosition.bottom:
                    newSize -= delta; // увеличить высоту блока вверх
                    break;

                default:
                    break;
            }

            // Ограничить размер минимальным и максимальным
            newSize = Math.max(minSize, Math.min(newSize, maxSize));
            setSize(newSize);
            setStartCoordinate(coordinate);
        },
        [position, minSize, maxSize, isResizing]
    );

    /**
     * Обработчик окончания изменения размера блока
     * @param {DocumentEventMap['mouseup']} e - событие мыши
     */
    const onMouseUp = useCallback(
        (e: DocumentEventMap['mouseup']) => {
            if (isResizing) {
                setIsResizing(false);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.body.style.pointerEvents = '';
            }
        },
        [isResizing]
    );

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isResizing, onMouseMove, onMouseUp]);

    /** Получить стили блока в зависимости от расположения */
    const getBlockStyle = useCallback((): CSSProperties => {
        const baseStyle: CSSProperties = {
            position: 'relative',
            overflow: 'auto',
            display: isHidden ? 'none' : 'block',
            zIndex: 10,
        };

        switch (position) {
            case PanelPosition.left:
                return {
                    ...baseStyle,
                    width: `${size}px`,
                    height: '100%',
                };

            case PanelPosition.right:
                return {
                    ...baseStyle,
                    width: `${size}px`,
                    height: '100%',
                };

            case PanelPosition.bottom:
                return {
                    ...baseStyle,
                    height: `${size}px`,
                    width: '100%',
                    zIndex: 11,
                };

            default:
                return baseStyle;
        }
    }, [position, size, isHidden]);

    // Рендер элемента, за который можно тянуть для изменения размера блока
    const getResizeStyle = useCallback((): CSSProperties => {
        const resizerStyle: CSSProperties = {
            position: 'absolute',
            cursor: getCursorStyle(),
        };

        switch (position) {
            case PanelPosition.left:
                return {
                    ...resizerStyle,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 8,
                };

            case PanelPosition.right:
                return {
                    ...resizerStyle,
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 8,
                };

            case PanelPosition.bottom:
                return {
                    ...resizerStyle,
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 8,
                };

            default:
                return resizerStyle;
        }
    }, [position, onMouseDown, getCursorStyle]);

    return (
        <div id={id} ref={blockRef} style={getBlockStyle()}>
            {children}
            <div style={getResizeStyle()} onMouseDown={onMouseDown} />
        </div>
    );
};
