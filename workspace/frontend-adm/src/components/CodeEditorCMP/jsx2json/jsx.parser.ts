import type { Token, ASTNode, Jsx2JsonOptions } from 'components/CodeEditorCMP/types';

type ChildNode = ASTNode | string;

export default function parser(tokens: Token[], opts: Jsx2JsonOptions = {}): ASTNode | ASTNode[] {
    let current = 0;
    let token: Token | undefined = tokens[current];

    const parseProps = (): Record<string, unknown> => {
        const props: Record<string, unknown> = {};
        let key: string | null = null;
        let last: string | null = null;

        while (current < tokens.length && token && token.type !== 'endTag' && token.type !== 'closeTag') {
            if (last && token.type === 'word') {
                props[last] = true;
                last = token.value as string;
            } else if (!key && token.type === 'word') {
                last = token.value as string;
            } else if (last && token.type === 'equals') {
                key = last;
                last = null;
            } else if (key && token.type === 'code') {
                if (opts.useEval) {
                    try {
                        const tokenvalue = JSON.parse(token.value as string);
                        props[key] = tokenvalue;
                    } catch (_e) {
                        // eslint-disable-next-line no-eval
                        props[key] = eval(`(()=>{ return ${String(token.value)}})()`);
                    }
                } else {
                    props[key] = token.value;
                }
                key = null;
                last = null;
            } else if (key && (token.type === 'number' || token.type === 'text' || token.type === 'boolean')) {
                props[key] = token.value;
                key = null;
                last = null;
            } else {
                throw new Error(`Invalid property value: ${key}=${String(token.value)}`);
            }
            token = tokens[++current];
        }
        if (last) props[last] = true;
        return props;
    };

    const genNode = (tagType: string): ASTNode => {
        token = tokens[++current];

        const result: ASTNode & { children?: ChildNode[] } = {};
        if (tagType !== 'json') {
            result.component = tagType;

            const properties = parseProps();
            if (JSON.stringify(properties) !== '{}') {
                result.properties = properties;
            }

            const children = getChildren(tagType);
            if (children.length > 0) {
                result.children = children;
            }
        } else {
            const properties = parseProps();
            if (JSON.stringify(properties) !== '{}') {
                // result = properties is intentional for json tagType
                Object.assign(result, properties);
            }
        }

        return result;
    };

    const getChildren = (tagType: string): ChildNode[] => {
        const children: ChildNode[] = [];
        while (current < tokens.length) {
            if (token?.type === 'endTag') {
                if (token.value && token.value !== tagType) {
                    throw new Error(
                        `Invalid closing tag: ${String(token.value)}. Expected closing tag of type: ${tagType}`,
                    );
                } else {
                    break;
                }
            }
            if (token?.type === 'openTag') {
                children.push(genNode(token.value as string));
            } else if (token?.type === 'text') {
                children.push(token.value as string);
            }
            token = tokens[++current];
        }
        return children;
    };

    const result = getChildren('');
    if (result.length === 1) return result[0] as ASTNode;
    return result.filter((n): n is ASTNode => typeof n !== 'string');
}