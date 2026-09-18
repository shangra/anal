import React, { useState } from 'react';
import { ClearIcon, Input, List, ListOption } from 'ui-kit';

import { escapeRegExp } from '../../../../helpers/regs';

interface IProps {
    value: string[];
    options: ListOption<string>[];
    onChange: (value: any) => void;
}

const FormulasList: React.FC<IProps> = ({ value, options, onChange }: IProps) => {
    const [search, setSearch] = useState('');

    let filteredOptions = options;
    if (search) {
        filteredOptions = options.filter(({ label, value, title, hint }) => {
            const filterRegExp = escapeRegExp(search);
            const regexp = new RegExp(filterRegExp, 'i');

            return (
                (label && regexp.test(label)) ||
                (value && regexp.test(value)) ||
                (title && regexp.test(title)) ||
                (hint && regexp.test(hint))
            );
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-kit-spacing-4)' }}>
            <Input
                type="text"
                value={search}
                fullWidth
                rightIcon={ClearIcon}
                onClick={(e) => {
                    e.stopPropagation();
                }}
                onClickRightIcon={() => {
                    setSearch('');
                }}
                onChange={(e) => {
                    setSearch(e.target.value ?? '');
                }}
            />
            <List type="single" value={value} options={filteredOptions} onChange={onChange} />
        </div>
    );
};

export default FormulasList;
