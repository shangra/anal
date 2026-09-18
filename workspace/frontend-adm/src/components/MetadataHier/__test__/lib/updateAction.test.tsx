import React from 'react';
import { render } from '@testing-library/react';
import { UpdateAction } from 'components/MetadataHier/actions/update';
import type { NormalizedNode } from 'components/MetadataHier/types';
import type { TreeDataControlled } from 'ui-kit';

// ——— моки ———
jest.mock('components/MetadataHier/lib/service', () => ({
    getNodeByKey: jest.fn(),
    isRoot: jest.fn(),
    reloadRootRecursively: jest.fn(),
    handleReloadNode: jest.fn(),
    clearSelectedIds: jest.fn(),
}));

jest.mock('components/MetadataHier/lib/cache', () => ({
    clearCache: jest.fn(),
}));

const { getNodeByKey, isRoot, reloadRootRecursively, handleReloadNode, clearSelectedIds } = require('components/MetadataHier/lib/service');
const { clearCache } = require('components/MetadataHier/lib/cache');

// ——— хелперы ———

function makeMockNode(overrides: Partial<NormalizedNode> = {}): NormalizedNode {
    return {
        nodeKey: 'root/1',
        id: 'id-1',
        name: 'Узел 1',
        description: '',
        crud: [],
        needToLoading: false,
        ownerId: null,
        classId: null,
        class: null,
        routes: null,
        parentId: 'root',
        childrenIds: [],
        depth: 1,
        expandable: false,
        isExpanded: false,
        isLoading: false,
        isLoaded: true,
        sortOrder: undefined,
        loadStatus: undefined,
        loadStrategy: 'lazy',
        events: {},
        icon: null,
        ...overrides,
    };
}

function makeMockTreeDataControlled(overrides: Partial<TreeDataControlled> = {}): TreeDataControlled {
    return {
        id: 'root/1',
        title: 'Узел 1',
        hasChildren: false,
        children: [],
        ...overrides,
    };
}

function mockIsRoot(is: boolean) {
    (isRoot as jest.Mock).mockReturnValue(is);
}

// ——— тесты visibility ———

describe('UpdateAction — видимость кнопки', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (clearCache as jest.Mock).mockReturnValue(undefined);
        (reloadRootRecursively as jest.Mock).mockResolvedValue(undefined);
        (handleReloadNode as jest.Mock).mockResolvedValue(undefined);
    });

    test('когда nodes пуст — кнопка видна', () => {
        const { container } = render(
            <UpdateAction server="srv" nodes={[] as TreeDataControlled[]} />,
        );
        // IconButton из ui-kit рендерит <button> или <div>
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeTruthy();
    });

    test('когда выделен узел с hasChildren=true — кнопка видна', () => {
        const mockNode = makeMockNode({ nodeKey: 'root/1' });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => (key === 'root/1' ? mockNode : null));
        mockIsRoot(false);

        const treeNode = makeMockTreeDataControlled({ id: 'root/1', hasChildren: true });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNode]} />,
        );
        // Кнопка должна быть видна
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeTruthy();
    });

    test('когда выделен узел без hasChildren и не expandable — кнопка скрыта', () => {
        const mockNode = makeMockNode({ nodeKey: 'root/1', expandable: false });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => (key === 'root/1' ? mockNode : null));
        mockIsRoot(false);

        const treeNode = makeMockTreeDataControlled({ id: 'root/1', hasChildren: false });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNode]} />,
        );
        // Кнопка должна быть скрыта
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeFalsy();
    });

    test('когда выделен узел с expandable=true — кнопка видна', () => {
        const mockNode = makeMockNode({ nodeKey: 'root/1', expandable: true, childrenIds: [] });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => (key === 'root/1' ? mockNode : null));
        mockIsRoot(false);

        const treeNode = makeMockTreeDataControlled({ id: 'root/1', hasChildren: false });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNode]} />,
        );
        // Кнопка должна быть видна
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeTruthy();
    });

    test('когда выделен корень — кнопка видна', () => {
        const mockNode = makeMockNode({ nodeKey: 'root', expandable: false, childrenIds: [] });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => (key === 'root' ? mockNode : null));
        mockIsRoot(true);

        const treeNode = makeMockTreeDataControlled({ id: 'root', hasChildren: false });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNode]} />,
        );
        // Кнопка должна быть видна (корень всегда refreshable)
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeTruthy();
    });

    test('когда выделены несколько узлов, хотя бы один refreshable — кнопка видна', () => {
        const mockNodeA = makeMockNode({ nodeKey: 'root/1', expandable: true });
        const mockNodeB = makeMockNode({ nodeKey: 'root/2', expandable: false });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => {
            if (key === 'root/1') return mockNodeA;
            if (key === 'root/2') return mockNodeB;
            return null;
        });
        mockIsRoot(false);

        const treeNodeA = makeMockTreeDataControlled({ id: 'root/1', hasChildren: false });
        const treeNodeB = makeMockTreeDataControlled({ id: 'root/2', hasChildren: false });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNodeA, treeNodeB]} />,
        );
        // Кнопка должна быть видна (root/1 refreshable)
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeTruthy();
    });

    test('когда выделены несколько узлов, ни один не refreshable — кнопка скрыта', () => {
        const mockNodeA = makeMockNode({ nodeKey: 'root/1', expandable: false });
        const mockNodeB = makeMockNode({ nodeKey: 'root/2', expandable: false });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => {
            if (key === 'root/1') return mockNodeA;
            if (key === 'root/2') return mockNodeB;
            return null;
        });
        mockIsRoot(false);

        const treeNodeA = makeMockTreeDataControlled({ id: 'root/1', hasChildren: false });
        const treeNodeB = makeMockTreeDataControlled({ id: 'root/2', hasChildren: false });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNodeA, treeNodeB]} />,
        );
        // Кнопка должна быть скрыта
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeFalsy();
    });

    test('expandable=true, childrenIds=[] — кнопка видна', () => {
        const mockNode = makeMockNode({ nodeKey: 'root/1', expandable: true, childrenIds: [] });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => (key === 'root/1' ? mockNode : null));
        mockIsRoot(false);

        const treeNode = makeMockTreeDataControlled({ id: 'root/1', hasChildren: false });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNode]} />,
        );
        expect(container.querySelector('.icon-button') || container.querySelector('button') || container.querySelector('[title]')).toBeTruthy();
    });
});

// ——— тесты click handlers ———

describe('UpdateAction — обработчики кликов', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (clearCache as jest.Mock).mockReturnValue(undefined);
        (reloadRootRecursively as jest.Mock).mockResolvedValue(undefined);
        (handleReloadNode as jest.Mock).mockResolvedValue(undefined);
    });

    test('когда nodes пуст — при клике reloadRootRecursively', async () => {
        const { container } = render(
            <UpdateAction server="srv" nodes={[] as TreeDataControlled[]} />,
        );

        const btn = container.querySelector('button') || container.querySelector('[title]');
        if (btn) {
            (btn as HTMLElement).click();
            expect(clearCache).toHaveBeenCalledWith('srv');
            expect(reloadRootRecursively).toHaveBeenCalledWith('srv');
        }
    });

    test('когда выделен refreshable узел — при клике handleReloadNode', async () => {
        const mockNode = makeMockNode({ nodeKey: 'root/parent', expandable: true, childrenIds: [] });
        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => (key === 'root/parent' ? mockNode : null));
        mockIsRoot(false);

        const treeNode = makeMockTreeDataControlled({ id: 'root/parent', hasChildren: true });
        const { container } = render(
            <UpdateAction server="srv" nodes={[treeNode]} />,
        );

        const btn = container.querySelector('button');
        if (btn) {
            btn.click();
            expect(clearCache).not.toHaveBeenCalled();
            expect(reloadRootRecursively).not.toHaveBeenCalled();
            expect(handleReloadNode).toHaveBeenCalledWith('srv', 'root/parent');
        }
    });

    test('parent+child оба refreshable → handleReloadNode только для parent', async () => {
        const mockParent = makeMockNode({ nodeKey: 'root/parent', id: 'root/parent', expandable: true, childrenIds: ['root/child'] });
        const mockChild = makeMockNode({ nodeKey: 'root/parent/child', id: 'root/parent/child', expandable: true, childrenIds: [] });

        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => {
            if (key === 'root/parent') return mockParent;
            if (key === 'root/parent/child') return mockChild;
            return null;
        });
        mockIsRoot(false);

        const parentTree = makeMockTreeDataControlled({ id: 'root/parent', hasChildren: true });
        const childTree = makeMockTreeDataControlled({ id: 'root/parent/child', hasChildren: false });

        const { container } = render(
            <UpdateAction server="srv" nodes={[parentTree, childTree]} />,
        );

        const btn = container.querySelector('button');
        expect(btn).toBeTruthy();
        btn!.click();

        // Parent refreshable → child отфильтрован
        expect(handleReloadNode).toHaveBeenCalledWith('srv', 'root/parent');
        expect(handleReloadNode).not.toHaveBeenCalledWith('srv', 'root/parent/child');
    });

    test('parent не refreshable + child refreshable → child остаётся', async () => {
        const mockParent = makeMockNode({ nodeKey: 'root/parent', id: 'root/parent', expandable: false, childrenIds: [] });
        const mockChild = makeMockNode({ nodeKey: 'root/parent/child', id: 'root/parent/child', expandable: true, childrenIds: [] });

        (getNodeByKey as jest.Mock).mockImplementation((_server, key: string) => {
            if (key === 'root/parent') return mockParent;
            if (key === 'root/parent/child') return mockChild;
            return null;
        });
        mockIsRoot(false);

        const parentTree = makeMockTreeDataControlled({ id: 'root/parent', hasChildren: false });
        const childTree = makeMockTreeDataControlled({ id: 'root/parent/child', hasChildren: false });

        const { container } = render(
            <UpdateAction server="srv" nodes={[parentTree, childTree]} />,
        );

        const btn = container.querySelector('button');
        expect(btn).toBeTruthy();
        btn!.click();

        // Parent не refreshable → child НЕ отфильтрован
        expect(handleReloadNode).toHaveBeenCalledWith('srv', 'root/parent/child');
    });
});
