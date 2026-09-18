import React from 'react';
import { Button } from 'ui-kit';

interface AddRowButtonProps {
    onClick: () => void;
}

export const AddRowButton: React.FC<AddRowButtonProps> = ({ onClick }) => (
    <Button
        size="small"
        color="success"
        onClick={onClick}
    >
        Добавить строку
    </Button>
);