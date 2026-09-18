import Ref from "./Ref";

interface Alias {
    id: string,
    code: number,
    markdel: number,
    owner_id: string,
    class_id: string,
    class: string,
    name: string,
    description: string,
    manifest: {
        owner_id: string,
        class_id: string,
        class: string,
        name: string,
        description: string,
        settings: {
            ref: Ref
        },
        events: {}
    },
    createdAt: string,
    updatedAt: string,
    createdUser: string,
    updatedUser: string,
    rank: 0
}

export default Alias;