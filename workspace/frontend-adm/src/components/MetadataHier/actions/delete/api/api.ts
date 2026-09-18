import { toRawNode } from 'components/MetadataHier/lib/normalize';
import { NormalizedNode } from 'components/MetadataHier/types';
import $api from 'helpers/axios';
import { buildUrl } from 'helpers/buildUrl';

export async function deleteNode(node: NormalizedNode, server: string = ''): Promise<void> {
    const rawNode = toRawNode(node);
    const path = buildUrl(server, node.routes, 'metadata', node.id);
    await $api.delete(`/${path}`, {
        data: rawNode,
    });
}
