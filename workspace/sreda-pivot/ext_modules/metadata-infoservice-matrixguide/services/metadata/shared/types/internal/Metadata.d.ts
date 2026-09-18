export default interface Metadata<ManifestT = { settings: {} }> {
    id: string,
    code: number,
    markdel: number,
    parent: string,
    class_id: string,
    class: string,
    name: string,
    description: string,
    manifest: ManifestT,
    rank: number,
    updatedAt: Date,
    createdAt: Date,
    createdUser: string,
    updatedUser: string
}