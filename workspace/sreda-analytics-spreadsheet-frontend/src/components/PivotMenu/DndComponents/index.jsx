import {
    DndContext,
    DragOverlay,
    PointerSensor,
    pointerWithin,
    useDndMonitor,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import cn from 'classnames';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ActiveItem } from '../ActiveItem';
import { canDrop } from '../helpers/dndRules';
import styles from './styles.module.css';

class PortalSafePointerSensor extends PointerSensor {
    static activators = [
        {
            eventName: 'onPointerDown',
            handler: ({ nativeEvent: event }) => {
                const { currentTarget, target } = event;

                if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
                    return false;
                }

                const targetSortable = target.closest('[data-draggable-id]');
                if (!targetSortable || !event.currentTarget.contains(targetSortable)) {
                    return false;
                }

                return true;
            },
        },
    ];
}

export function DndContextWrapper({ children, onDragStart, onDragEnd, onDragOver, onDragCancel, uuid, draggingItem: item }) {
    const sensors = useSensors(
        useSensor(PortalSafePointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
            onDragOver={onDragOver}
        >
            {children}

            {item &&
                createPortal(
                    <DragOverlay className={styles.overlay} style={{ zIndex: 1046 }} dropAnimation={null}>
                        <ActiveItem uuid={uuid} item={item} isDragging hasCheck={false} />
                    </DragOverlay>,
                    document.fullscreenElement ? document.getElementById('fullscreen-portals') : document.body,
                )}
        </DndContext>
    );
}

export function SortableItem({ uuid, id, className = '', children, sourceBlock, elementData }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        data: {
            uuid,
            element: elementData,
            sourceBlock,
            originalId: elementData.id,
        },
    });

    return (
        <div
            ref={setNodeRef}
            className={className}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.3 : 1,
                cursor: isDragging ? 'grabbing' : 'grab',
                visibility: 'visible',
                position: 'relative',
            }}
            {...attributes}
            {...listeners}
            data-draggable-id={id}
        >
            {typeof children === 'function' ? children(isDragging) : children}
        </div>
    );
}

export function SortableContainer({ id, className = '', type, items, children }) {
    const containerRef = useRef(null);

    const [sourceBlockType, setSourceBlockType] = useState(null);
    const [paramType, setParamType] = useState(null);
    const [uuid, setUuid] = useState(null);

    const { setNodeRef } = useDroppable({
        id,
        data: {
            sourceBlock: type,
            type: 'container',
        },
    });

    useDndMonitor({
        onDragStart(event) {
            setSourceBlockType(event.active.data.current?.sourceBlock);
            setParamType(event.active.data.current?.element?.typeParam ?? null);
            setUuid(event.active.data.current?.uuid ?? null);
        },
        onDragEnd() {
            setParamType(null);
            setSourceBlockType(null);
            setUuid(null);
        },
        onDragCancel() {
            setParamType(null);
            setSourceBlockType(null);
            setUuid(null);
        },
    });

    const isTarget = canDrop(sourceBlockType, type, paramType);

    const itemIds = items.map((item) => `${type}_${item.id}`);

    return (
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div
                ref={(node) => {
                    setNodeRef(node);
                    containerRef.current = node;
                }}
                className={cn(styles.target, className)}
            >
                {children}
                {isTarget && id === `${type}_${uuid}` && <div className={styles.target__area} />}
            </div>
        </SortableContext>
    );
}
