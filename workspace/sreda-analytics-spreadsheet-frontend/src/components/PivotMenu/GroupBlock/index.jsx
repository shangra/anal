import { DropDownIcon, DropRightIcon, FolderIcon, IconButton } from 'ui-kit';

import styles from './styles.module.css';

export const GroupBlock = ({ groupId, isOpen, onToggle }) => (
    <div className={styles.container}>
        <IconButton
            size="small"
            color="secondary"
            variant="text"
            onClick={onToggle}
            icon={isOpen ? DropDownIcon : DropRightIcon}
        />

        <div className={styles.title}>
            <div className={styles.folder_icon}>
                <FolderIcon size="small" />
            </div>
            {groupId}
        </div>
    </div>
);
