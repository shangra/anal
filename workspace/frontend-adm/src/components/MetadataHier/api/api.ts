import $api from 'helpers/axios';
import { RawChildNode, RawRootNode } from 'components/MetadataHier/types';
import { buildUrl } from 'helpers/buildUrl';

const TREE_BASE = '/metadata';
const VER_URL = 'v3/tree';

export async function fetchRoot(server: string): Promise<RawRootNode> {
    const url = buildUrl(server, TREE_BASE, VER_URL);
    const { data } = await $api.get<RawRootNode>(url, { params: { hideSubTree: true } });
    return data;
}

export async function fetchChildren(parentId: string, server: string): Promise<RawChildNode[]> {
    const url = buildUrl(server, TREE_BASE, VER_URL, parentId);
    const { data } = await $api.get<RawChildNode[]>(url, {
        params: { order: JSON.stringify([['name', 'ASC']]), hideSubTree: true },
    });
    return data;
}
