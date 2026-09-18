export interface Schema {
    id: string;
    name: string;
    standart: boolean;
    forAll: boolean;
    givenPermissions?: boolean;
}

export interface Category {
    value: string;
    label: string;
    children: Schema[];
}

export interface SchemaSelectProps {
    treeSchemas: Category[];
    selectedValue?: string;
    schemasList?: Schema[];
    disabled?: boolean;
    placeholder?: string;
    onChange: (value: string) => void;
    getSchemaList: (showProgress?: boolean) => void;
}

export interface SchemaSelectState {
    isPopoverOpen: boolean;
    searchValue: string;
    expandedCategories: Record<string, boolean>;
}
