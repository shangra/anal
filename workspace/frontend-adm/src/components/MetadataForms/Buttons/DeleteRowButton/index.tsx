import React from 'react';
import { Button } from 'ui-kit';

interface DeleteRowButtonProps {
    onClick: () => void;
    disabled: boolean;
    name?: string;
}

export const DeleteRowButton: React.FC<DeleteRowButtonProps> = ({
    onClick,
    disabled
}) => (
    <Button
        size="small"
        color="error"
        onClick={onClick}
        disabled={disabled}
    >
        Удалить строку
    </Button>
);