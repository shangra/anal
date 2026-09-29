import React from 'react';
import { Button } from 'ui-kit';

interface AddRowButtonProps {
    onClick: () => void;
    disabled?: boolean;
    name?: string;
}

export const AddRowButton: React.FC<AddRowButtonProps> = ({
    onClick,
    disabled,
    name,
}) => (
    <Button size='small' color='primary' onClick={onClick} disabled={disabled} data-name={name}>
        Добавить строку
    </Button>
);
