import type { Meta, StoryObj } from '@storybook/react';

import { MetaField } from 'components/DRQueryBuilder/types';
import { DRQueryBuilder } from '.';

const meta: Meta<typeof DRQueryBuilder> = {
    title: 'Components/DRQueryBuilder',
    component: DRQueryBuilder,
};

const fieldsData = [
    // {
    //     id: '1',
    //     label: 'account_kt',
    //     valueEditorType: 'input',
    //     values: [],
    // },
    {
        id: '2',
        label: 'Счет ДТ',
        value: 'account_dt',
        valueEditorType: 'input',
        values: [],
    },
    {
        id: '4',
        label: 'Счет УУ',
        value: 'account_uu',
        valueEditorType: 'input',
        values: [],
    },
    {
        id: '5',
        label: 'Сумма',
        value: 'total',
        valueEditorType: 'input',
        values: [],
    },
    {
        id: '3',
        label: 'Роль',
        value: 'role',
        type: 'input',
    },
] as MetaField[];

export default meta;
type Story = StoryObj<typeof DRQueryBuilder>;
export const Default: Story = {
    args: {},
    render: (args) => <DRQueryBuilder mode="query" fields={fieldsData} />,
};
