import React from 'react';
import { IconButton, ArrowDownIcon, ArrowUpIcon } from 'ui-kit';

interface MoveRowButtonsProps {
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    name?: string;
}

export const MoveRowButtons: React.FC<MoveRowButtonsProps> = ({
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown
}) => (
        <>
            <IconButton
                size="small"
                color="primary"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                icon={ArrowUpIcon}
            />
            <IconButton
                size="small"
                color="primary"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                icon={ArrowDownIcon}
            />
        </>
    );