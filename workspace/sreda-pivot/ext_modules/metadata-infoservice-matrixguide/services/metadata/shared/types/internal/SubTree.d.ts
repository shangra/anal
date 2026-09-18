interface SubTree {
    "id": string,
    "owner_id": string,
    "class_id": string,
    "class": string,
    "name": string,
    "description": string,
    "crud": string[],
    "routes": string,
    "children": SubTree[]
}

export default SubTree;