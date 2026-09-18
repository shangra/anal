export type FormFieldType = 'STRING' | 'INTEGER' | 'BOOL' | 'TEXT' | 'LIST' | 'REF' | 'DATE' | 'DATETIME' | 'JSON';

export type FormField = {
    name: string;
    description: string;
    type: FormFieldType;
    template?: string;
    list?: Record<string, string>;
    link: {
        type: string;
        metalink?: string;
        parent?: string;
        field?: string[];
    };
    useParent?: boolean;
    parent?: string;
};

export interface FormButton {
    component: string;
    name: string;
    props: Record<string, any>;
}

export type FormSchema = {
    type: 'create' | 'update';
    form: FormField[];
    buttons?: FormButton[];
    manifest: { name: string; description: string };
    data: Record<string, string>;
};

export type CreateNodePayload = {
    owner_id: string;
    class_id: string;
    class: string;
    name: string;
    description: string;
    settings: Record<string, unknown>;
    events: Record<string, unknown>;
};

export type CreateNodeResponse = {
    class: string;
    class_id: string;
    code: number;
    createdAt: string;
    createdUser: string;
    description: string;
    id: string;
    manifest: string;
    markdel: 0 | 1;
    name: string;
    owner_id: string;
    rank: number;
    updatedAt: string;
    updatedUser: string;
};

export interface FormCompositeValue {
    type: number;
    value: string;
    link?: string;
}

/** Плоские значения формы — собираются в buildValuesFromForm */
export interface FormValues {
    'manifest.name': string;
    'manifest.description': string;
    [key: string]: string | FormCompositeValue[] | undefined;
}
