import type { Meta, StoryObj } from '@storybook/react';

import { ChartGeneration } from './ChartGeneration';

const meta: Meta<typeof ChartGeneration> = {
    title: 'Components/ChartGeneration',
    component: ChartGeneration,
};

export default meta;
type Story = StoryObj<typeof ChartGeneration>;

const COMMON_PROPS = {
    width: 1000,
    height: 500,
};

export const Default: Story = {
    args: {
        type: 'area',
        meta: {
            ...COMMON_PROPS,
        },
        chartValues: [
            {
                category: 'Category 1',
                lines: {
                    x: 10,
                    y: 30,
                },
            },
            {
                category: 'Category 2',
                lines: {
                    x: 40,
                    y: 30,
                },
            },
            {
                category: 'Category 3',
                lines: {
                    x: 60,
                    y: 20,
                },
            },
        ],
    },
};

export const Area: Story = {
    args: {
        type: 'area',
        meta: {
            ...COMMON_PROPS,
        },
        chartValues: [
            {
                category: 'Category 1',
                lines: {
                    x: 10,
                    y: 30,
                },
            },
            {
                category: 'Category 2',
                lines: {
                    x: 40,
                    y: 30,
                },
            },
            {
                category: 'Category 3',
                lines: {
                    x: 60,
                    y: 20,
                },
            },
        ],
    },
};

export const Line: Story = {
    args: {
        type: 'line',
        meta: {
            ...COMMON_PROPS,
        },
        chartValues: [
            {
                category: 'Category 1',
                lines: {
                    x: 10,
                    y: 30,
                },
            },
            {
                category: 'Category 2',
                lines: {
                    x: 40,
                    y: 30,
                },
            },
            {
                category: 'Category 3',
                lines: {
                    x: 60,
                    y: 20,
                },
            },
        ],
    },
};

export const Bar: Story = {
    args: {
        type: 'bar',
        meta: {
            ...COMMON_PROPS,
        },
        chartValues: [
            {
                category: 'Category 1',
                lines: {
                    x: 10,
                    y: 30,
                },
            },
            {
                category: 'Category 2',
                lines: {
                    x: 40,
                    y: 30,
                },
            },
            {
                category: 'Category 3',
                lines: {
                    x: 60,
                    y: 20,
                },
            },
        ],
    },
};

export const Scatter: Story = {
    args: {
        type: 'scatter',
        meta: {
            ...COMMON_PROPS,
        },
        chartValues: [
            {
                title: 'Группа 1',
                coordinate: [
                    {
                        x: 1,
                        y: 2,
                        z: 6,
                    },
                    {
                        x: 4,
                        y: 3,
                        z: 9,
                    },
                ],
            },
        ],
    },
};

export const Pie: Story = {
    args: {
        type: 'pie',
        meta: {
            ...COMMON_PROPS,
        },
        chartValues: [
            {
                title: 'Группа 1',
                values: [
                    {
                        title: 'Название 1',
                        value: 1,
                    },
                    {
                        title: 'Название 2',
                        value: 3,
                    },
                ],
            },
            {
                title: 'Группа 2',
                values: [
                    {
                        title: 'Название 1',
                        value: 5,
                    },
                    {
                        title: 'Название 2',
                        value: 8,
                    },
                ],
            },
        ],
    },
};
