import { ReactNode } from 'react';
import { TabProps } from 'ui-kit';

export type PageHeaderProps = {
    rootPageId?: string;
    title: string;
    actions?: ReactNode[];
    tabs?: TabProps[];
    currentTab?: number;
    onSetTab?: (value: number) => void;
};
