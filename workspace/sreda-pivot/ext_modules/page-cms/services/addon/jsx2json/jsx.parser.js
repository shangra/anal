module.exports = (tokens, opts = {}) => {
    const nodes = [];
    let current = 0;
    let token = tokens[current];

    const parseProps = () => {
        const props = {};
        let key = null;
        let last = null;

        while (
            current < tokens.length &&
            token.type !== 'endTag' &&
            token.type !== 'closeTag'
        ) {
            if (last && token.type === 'word') {
                props[last] = true;
                last = token.value;
            } else if (!key && token.type === 'word') {
                last = token.value;
            } else if (last && token.type === 'equals') {
                key = last;
                last = null;
            } else if (key && token.type === 'code') {
                if (opts.useEval) {
                    try {
                        if (
                            typeof token.value === 'string' &&
                            token.value.indexOf('this') === 0
                        ) {
                            props[key] = '`' + token.value + '`';
                        } else {
                            props[key] = JSON.parse(token.value);
                        }
                    } catch (e) {
                        try {
                            props[key] = eval(
                                `(()=>{ return ${token.value}})()`
                            );
                        } catch (e) {
                            props[key] = `(e)=>${token.value}`;
                        }
                    }
                } else {
                    props[key] = token.value;
                }
                key = null;
                last = null;
            } else if (
                key &&
                (token.type === 'number' ||
                    token.type === 'text' ||
                    token.type === 'boolean')
            ) {
                props[key] = token.value;
                key = null;
                last = null;
            } else {
                throw `Invalid property value: ${key}=${token.value}`;
            }
            token = tokens[++current];
        }
        if (last) props[last] = true;
        return props;
    };

    const genNode = (tagType) => {
        token = tokens[++current];

        let result = {};
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
                result = properties;
            }
        }

        return result;
    };

    const getChildren = (tagType) => {
        const children = [];
        while (current < tokens.length) {
            if (token.type === 'endTag') {
                if (token.value && token.value !== tagType) {
                    throw `Invalid closing tag: ${token.value}. Expected closing tag of type: ${tagType}`;
                } else {
                    break;
                }
            }
            if (token.type === 'openTag') {
                children.push(genNode(token.value));
            } else if (token.type === 'text') {
                children.push(token.value);
            }
            token = tokens[++current];
        }
        return children;
    };

    const result = getChildren();
    if (result.length === 1) return result[0];
    return result;
};
