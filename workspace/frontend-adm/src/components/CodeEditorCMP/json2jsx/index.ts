import type { Json2JsxOptions } from 'components/CodeEditorCMP/types';

interface JsonObject {
    component?: string;
    properties?: Record<string, unknown>;
    children?: unknown;
    [key: string]: unknown;
}

function convertJSONToJSX(value: unknown, tabStep = 4, tabSize = 0): string {
    const tabStr = ' '.repeat(tabSize);

    let result = tabStr + String(value);

    if (Array.isArray(value)) {
        result = value.map((arrayItem) => convertJSONToJSX(arrayItem, tabStep, tabSize)).join('\n');
    } else if (typeof value === 'object' && value !== null) {
        const obj = value as JsonObject;
        let childrens: string | undefined;

        if (obj.children !== undefined) {
            childrens = convertJSONToJSX(obj.children, tabStep, tabSize + 4);
        }

        const componentName = obj.component ?? 'json';

        let componentProps: string | undefined;
        const props = obj.properties;
        if (props !== undefined) {
            const componentPropsArray: string[] = [];
            for (const propName in props) {
                if (Object.prototype.hasOwnProperty.call(props, propName)) {
                    let propValue = props[propName];
                    if (typeof propValue === 'object' && propValue !== null) {
                        propValue = JSON.stringify(propValue);
                        propValue = `{ ${propValue} }`;
                    } else {
                        propValue = `{ "${String(propValue)}" }`;
                    }
                    componentPropsArray.push(`${propName}=${propValue}`);
                }
            }
            componentProps = componentPropsArray.join(' ');
        }

        let template = `${tabStr}<${componentName}`;
        if (componentProps !== undefined) {
            template = `${template} ${componentProps}`;
        }

        if (childrens === undefined) {
            template += ' />';
        } else {
            template = `${template}>\n${childrens}\n${tabStr}</${componentName}>`;
        }

        result = template;
    }

    return result;
}

export default function json2jsx(data: unknown, options?: Json2JsxOptions): string {
    const tabStep = options?.tabStep ?? 4;
    return convertJSONToJSX(data, tabStep);
}