import React from 'react';
import { Dropdown } from 'ui-kit';

interface PersistToolbarProps {
    onOpenFileClick: () => void;
    onSaveDrp: () => void;
    onSaveXlsx: () => void;
    onFileSelected: (file: File) => void;
}

const PersistToolbar: React.FC<PersistToolbarProps> = ({ onOpenFileClick, onSaveDrp, onSaveXlsx, onFileSelected }) => {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleOpenFileClick = React.useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
        onOpenFileClick();
    }, [onOpenFileClick]);

    const handleFileChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
        },
        [onFileSelected],
    );

    const dropdownOptions = [
        { label: 'Открыть', onClick: handleOpenFileClick, title: 'Открыть файл (.drp)' },
        { label: 'Сохранить как DRP', onClick: onSaveDrp, title: 'Сохранить как DRP' },
        { label: 'Сохранить как XLSX', onClick: onSaveXlsx, title: 'Сохранить как XLSX' },
    ];

    return (
        <>
            <input ref={fileInputRef} type="file" accept=".drp" style={{ display: 'none' }} onChange={handleFileChange} />
            <Dropdown options={dropdownOptions} color="primary" variant="outlined">
                Файл
            </Dropdown>
        </>
    );
};

export default PersistToolbar;
