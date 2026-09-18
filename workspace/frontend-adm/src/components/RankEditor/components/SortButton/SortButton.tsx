import { useState } from 'react';
import { BUTTON_VARIANT, IconButton, SortArrowsIcon, SortAscIcon, SortDescIcon } from 'ui-kit';

interface SortButtonProps {
    onChange?: (sortDirection: undefined | 'asc' | 'desc') => void;
}
export const SortButton = ({ onChange }: SortButtonProps) => {
    const [sortDirection, setSortDirection] = useState<undefined | 'asc' | 'desc'>(undefined);

    const icon = sortDirection === undefined ? SortArrowsIcon : sortDirection === 'asc' ? SortAscIcon : SortDescIcon;

    const handleChange = () => {
        const nextOrder = sortDirection === undefined ? 'asc' : sortDirection === 'asc' ? 'desc' : undefined;

        setSortDirection(nextOrder);
        onChange?.(nextOrder);
    };

    return <IconButton icon={icon} variant={BUTTON_VARIANT.CONTAINED} onClick={handleChange} rounded />;
};
