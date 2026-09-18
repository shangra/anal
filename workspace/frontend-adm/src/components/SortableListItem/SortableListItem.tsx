import { DragDropDotIcon } from 'ui-kit';

interface SortableListItemProps {
    name: string;
    style?: React.CSSProperties;
}

export const SortableListItem = ({ name, style }: SortableListItemProps) => (
    <div
        style={{
            padding: '10px 12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: '#7C89AB14',
            userSelect: 'none',
            ...style,
        }}
    >
        <DragDropDotIcon />
        <span>{name}</span>
    </div>
);
