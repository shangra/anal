import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

export interface SortableItem {
    id: string;
    [key: string]: unknown;
}

interface SortableRowProps<T extends SortableItem> {
    item: T;
    renderItem: (item: T) => React.ReactNode;
    disabled: boolean;
}

function SortableRow<T extends SortableItem>({ item, renderItem, disabled }: SortableRowProps<T>) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
    };

    return (
        <div ref={setNodeRef} style={{ color: 'var(--ui-kit-colors-text-primary)', ...style }} {...attributes} {...listeners}>
            {renderItem(item)}
        </div>
    );
}

interface SortableListProps<T extends SortableItem> {
    items: T[];
    onChange: (items: T[]) => void;
    renderItem: (item: T) => React.ReactNode;
    isDisabled?: boolean;
}

export function SortableList<T extends SortableItem>({
    items,
    onChange,
    renderItem,
    isDisabled = false,
}: SortableListProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = ({ active, over }: any) => {
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        onChange(arrayMove(items, oldIndex, newIndex));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map((item) => (
                        <SortableRow key={item.id} item={item} renderItem={renderItem} disabled={isDisabled} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
