import { CSSProperties } from 'react';
import { type TreeSelectOption } from 'ui-kit';

/** id корневого узла дерева метаданных */
export const ROOT_ID = '00000000-0000-0000-0000-000000000000';

export type FormGRefData = {
    description: string;
    name: string;
    type: 'REF';
    useParent: boolean;
    link:
        | {
              metalink?: string | string[];
              type: 'local' | 'global'; // "simple" -> "local"
              parent?: string;
              field: string[];
          }
        | string;
    parent?: string;
};

export type FormGRefFormValues = {
    id: string;
    increment: boolean;
    length: number;
    'manifest.description': string;
    'manifest.name': string;
    nameField: string;
    notnull: boolean;
    onoff: boolean;
    type: 'date';
    foreignkey: {
        link: string;
        value: string;
    };
    ref: {
        link: string;
        value: string;
    };
} & {
    [key: string]: {
        link: string;
        value: string;
    };
};

export type FormGRefFormNode = {
    childrenIds: string[];
    class: string;
    classId: string;
    crud: string[];
    description: string;
    expandable: boolean;
    id: string;
    isExpanded: boolean;
    isLoaded: boolean;
    isLoading: boolean;
    name: string;
    ownerId: string;
    parentId: string;
    // parent: FormGRefMetadataLink;
    // reloadId: string;
    routes: string;
    nodeKey: string;
};

export type FormGRefParentInfo = Record<string, Record<string, any> | string>;

export type FormGRefValue = {
    link: string;
    value: string;
};

export type LinkObject = {
    link: string;
    metalink: string;
};

export type FormGRefMetadataLink = {
    class: string;
    class_id: string;
    code: number;
    createdAt: string;
    createdUser: string;
    description: string;
    id: string;
    manifest: string;
    markdel: 0 | 1;
    name: string;
    owner_id: string;
    rank: number;
    updatedAt: string;
    updatedUser: string;
};

export type ObjectMeta = {
    treeObject: Record<string, Record<string, Record<string, unknown>>>;
};

export type FormGRefProps = {
    server?: string;
    data: FormGRefData;
    formValues: FormGRefFormValues;
    node: FormGRefFormNode;
    parentInfo: FormGRefParentInfo;
    value: FormGRefValue | string;
    style?: CSSProperties;
    disabled?: boolean;
    onChange?: (name: string, value: {}, options: Record<string, FormGRefMetadataLink>) => void;
    onLoadData?: (parentInfo: Record<string, FormGRefMetadataLink>) => void;
};

export type FormGRefState = {
    options?: Record<string | number, string | Record<string, string>>;
    metalink: string;
    isGlobal: boolean;
    dataInfo: Record<string, Record<string, FormGRefMetadataLink>>;
    uuid: string;
    refLoading: boolean;
    server: string;
    titleLabels?: Record<string, string>;
};

export type TreeRefState = {
    treeData: TreeSelectOption<string>[];
    treeDataLoaded: boolean;
    treeDataLoading: boolean;
    expandedNodes: string[];
    loadedNodes: string[];
    treeDataKey: number;
};

export type TreeRefProps = {
    server?: string;
    dataName: string;
    value: FormGRefValue | string;
    disabled?: boolean;
    description?: string;
    onChange?: (name: string, value: {}, options: Record<string, FormGRefMetadataLink>) => void;
};
