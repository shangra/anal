import React, { useRef, useState } from 'react';

import { IPageData } from '../types';

interface PageTabProps {
    page: IPageData;
    isActive: boolean;
    canRemove: boolean;
    onActivate: () => void;
    onRename: (name: string) => void;
    onRemove: () => void;
}

function PageTab({ page, isActive, canRemove, onActivate, onRename, onRemove }: PageTabProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(page.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const commitRename = () => {
        setEditing(false);
        const name = draft.trim() || page.name;
        if (name !== page.name) onRename(name);
        else setDraft(page.name);
    };

    return (
        <div
            style={{
                padding: '4px 12px',
                cursor: 'pointer',
                borderRight: '1px solid var(--border-color)',
                background: isActive ? 'var(--bg-active)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minWidth: 60,
                userSelect: 'none',
            }}
            onClick={onActivate}
            onDoubleClick={() => {
                setDraft(page.name);
                setEditing(true);
                setTimeout(() => inputRef.current?.select(), 0);
            }}
        >
            {editing ? (
                <input
                    ref={inputRef}
                    value={draft}
                    style={{ width: 80, fontSize: 13 }}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') {
                            setEditing(false);
                            setDraft(page.name);
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span style={{ fontSize: 13 }}>{page.name}</span>
            )}
            {isActive && canRemove && (
                <span
                    style={{ fontSize: 10, opacity: 0.5, marginLeft: 2 }}
                    title="Удалить лист"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    ×
                </span>
            )}
        </div>
    );
}

export default PageTab;
