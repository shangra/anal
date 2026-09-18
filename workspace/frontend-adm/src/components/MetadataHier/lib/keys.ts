export function buildNodeKey(parentNodeKey: string | null, rawId: string): string {
    if (!parentNodeKey) return rawId;
    return `${parentNodeKey}/${rawId}`;
}
export function isRootNodeKey(nodeKey: string): boolean {
    return !nodeKey.includes('/');
}
