/**
 * Зеркало контракта из frontend-flow/src/components/FlowdemoProcessAdapter/types.ts.
 *
 * Копия, а не импорт: тянуть типы через границу MF означало бы жёсткую связку
 * сборок. При изменении контракта оба файла правятся одним заходом — это
 * зафиксировано в `.sdd/api-contracts.md` на стороне `frontend-flow`.
 */

export interface ResponseNode {
    id: string;
    type: string;
    [key: string]: unknown;
}

export interface ResponseConnection {
    type: 'connection';
    source: { id: string; position: string };
    destination: { id: string; position: string };
}

export interface ProcessSchema {
    nodes: ResponseNode[];
    connections: ResponseConnection[];
}

export interface NodeFormRef {
    processId: string;
    nodeId: string;
    formService: string;
}

export type HostEvent =
    | { type: 'node-saved'; nodeId: string; patch: Record<string, unknown> }
    | { type: 'node-deleted'; nodeId: string }
    | { type: 'schema-reload' };

export interface ProcessHostPort {
    loadSchema(processId: string): Promise<ProcessSchema>;
    saveSchema(processId: string, schema: ProcessSchema): Promise<void>;
    openNodeForm(ref: NodeFormRef | null): void;
    subscribe(listener: (event: HostEvent) => void): () => void;
    notifyDirty?(dirty: boolean): void;
}

export interface ProcessAppProps {
    processId: string;
    port?: ProcessHostPort;
}
