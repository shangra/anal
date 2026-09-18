import React from 'react';
import { Button } from 'ui-kit';

interface CopyRowButtonProps {
    onClick: () => void;
    disabled: boolean;
    name?: string;
}

export const CopyRowButton: React.FC<CopyRowButtonProps> = ({ onClick, disabled }) => (
    <Button
        size="small"
        color="primary"
        onClick={onClick}
        disabled={disabled}
    >
        Копировать строку
    </Button>
);