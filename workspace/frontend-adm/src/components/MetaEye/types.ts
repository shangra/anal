import { NormalizedNode } from 'components/MetadataHier/types';

export interface ChangeNodePayload {
    changeNode: {
        nodeId: string;
        manifest?: { name?: string; description?: string };
        newNode?: NormalizedNode;
        source?: string;
        ts?: number;
    };
}
