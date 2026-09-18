import { createRef, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { DragState } from 'components/MatrixTable/types';

const DRAG_THRESHOLD = 5;

// React class components requires RefObject<HTMLDivElement>, not RefObject<HTMLDivElement | null>
type ContainerRef = RefObject<HTMLDivElement>;

/**
 * Управляет drag-to-scroll на контейнере.
 * Вытесняет pointer-ивенты из компонента таблицы.
 */
export class DragScrollController {
    private state: DragState | null = null;

    private suppressClick = false;

    private suppressTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly containerRef: RefObject<HTMLDivElement | null>;

    private readonly dragCssClass: string;

    constructor(dragCssClass: string) {
        this.containerRef = createRef<HTMLDivElement>();
        this.dragCssClass = dragCssClass;
    }

    get ref(): ContainerRef {
        return this.containerRef as ContainerRef;
    }

    get isSuppressingClick(): boolean {
        return this.suppressClick;
    }

    onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
        if (event.button !== 0) return;

        const container = this.containerRef.current;
        if (!container) return;

        const canScrollX = container.scrollWidth > container.clientWidth;
        const canScrollY = container.scrollHeight > container.clientHeight;
        if (!canScrollX && !canScrollY) return;

        this.state = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startScrollLeft: container.scrollLeft,
            startScrollTop: container.scrollTop,
            moved: false,
        };
    };

    onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
        const drag = this.state;
        const container = this.containerRef.current;
        if (!drag || !container || event.pointerId !== drag.pointerId) return;

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;

        if (!drag.moved && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
            drag.moved = true;
            container.classList.add(this.dragCssClass);
            container.setPointerCapture(drag.pointerId);
        }

        if (drag.moved) {
            container.scrollLeft = drag.startScrollLeft - deltaX;
            container.scrollTop = drag.startScrollTop - deltaY;
            event.preventDefault();
        }
    };

    onPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
        const drag = this.state;
        const container = this.containerRef.current;
        if (!drag || event.pointerId !== drag.pointerId) return;

        container?.classList.remove(this.dragCssClass);

        if (drag.moved) {
            this.suppressClick = true;
            if (this.suppressTimer !== null) {
                clearTimeout(this.suppressTimer);
            }
            this.suppressTimer = setTimeout(() => {
                this.suppressClick = false;
                this.suppressTimer = null;
            }, 0);
        }

        if (container?.hasPointerCapture(drag.pointerId)) {
            container.releasePointerCapture(drag.pointerId);
        }

        this.state = null;
    };

    onPointerCancel = this.onPointerUp;

    destroy(): void {
        if (this.suppressTimer !== null) {
            clearTimeout(this.suppressTimer);
            this.suppressTimer = null;
        }
        this.state = null;
    }
}
