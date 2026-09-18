function preg_match_all(regexp: RegExp, str?: string): RegExpExecArray[] {
    if (!str) return [];
    return [...str.matchAll(regexp)];
}

interface IfElement {
    jsonObject: Record<string, unknown>;
    condition: string;
    true?: unknown;
    false?: unknown;
}

// Регулярные выражения используют обычные группы вместо именованных (?<name>...)
// для совместимости с target "es2015" — их нельзя менять без согласования конфига
function html2json(data: string, converter?: (str: string) => string): string {
    const jsonTemplates: Record<string, string | ((condition: string) => string)> = {
        if: (condition: string) =>
            `{"component": "if", "properties" : { "condition" : "${condition}"}, "children" : [{"component": "true","children" : [`,
        else: `]},{"component": "false", "children" : [`,
        endif: `]}]}`,
    };

    // eslint-disable-next-line prefer-regex-literals
    const ifregexp = new RegExp('<\\s?if\\scondition="(.+?)"\\s?><true>', 'gm');
    const elseregexp = /<\/true><false>/gm;
    const endIf = /<\/true><\/if>/gm;
    const endelseIf = /<\/false><\/if>/gm;

    let str = data;

    // IF
    let matches = preg_match_all(ifregexp, str);
    for (const match of matches) {
        const find = match[0].trim();
        const condition = match[1];

        let replaceStr = (jsonTemplates.if as (condition: string) => string)(condition);
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    // ELSE
    matches = preg_match_all(elseregexp, str);
    for (const match of matches) {
        const find = match[0].trim();

        let replaceStr = jsonTemplates.else as string;
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    // END ELSE IF
    matches = preg_match_all(endelseIf, str);
    for (const match of matches) {
        const find = match[0].trim();

        let replaceStr = jsonTemplates.endif as string;
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    // END IF
    matches = preg_match_all(endIf, str);
    for (const match of matches) {
        const find = match[0].trim();

        let replaceStr = jsonTemplates.endif as string;
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    return str;
}

function twig2html(data: string, converter?: (str: string) => string): string {
    const htmlTemplates: Record<string, string | ((...args: string[]) => string)> = {
        if: (inner: string) => `<if condition="${inner}"><true>`,
        endif: '</if>',
        else: '<else>',
        endfor: '</for>',
        endelse: (inner: string) => `</true><false>${inner}</false></if>`,
        endiftrue: (inner: string) => `<true>${inner}</true></if>`,
        for: (itProp: string, inProp: string) => `<for it={"${itProp}"} in={"${inProp}"}>`,
    };

    // eslint-disable-next-line prefer-regex-literals
    const re = new RegExp('{{\\s?([a-zA-Z.,|]+)\\s?}}', 'gm');
    // eslint-disable-next-line prefer-regex-literals
    const ifregexp = new RegExp('{%\\s?if\\s(.+?)\\s?%}', 'gm');
    // eslint-disable-next-line prefer-regex-literals
    const forregexp = new RegExp('{%\\s?for\\s([a-zA-Z]+)\\sin\\s([a-zA-Z.]+)\\s?%}', 'gm');
    // eslint-disable-next-line prefer-regex-literals
    const tagregexp = new RegExp('{%\\s?([a-zA-Z.,|]+)\\s?%}', 'gm');

    // eslint-disable-next-line prefer-regex-literals
    const closeElseRegexp = new RegExp('(<else>)([\\w\\W\\s]*?[^<\\/if>([\\w\\W\\s]*)<\\/if>', 'gm');
    // eslint-disable-next-line prefer-regex-literals
    const closeIfRegexp = new RegExp('(<true>)([\\w\\W\\s]*?[^<\\/if>([\\w\\W\\s]*)^<\\/if>', 'gm');

    const result: string[] = [];
    let str = data;

    // PARAMS
    const paramMatches = preg_match_all(re, str);
    for (const match of paramMatches) {
        if (match[1].indexOf('|') === -1 && match[1].indexOf('.') === -1) {
            result.push(match[1].trim());
        }
    }

    // IF
    let matches = preg_match_all(ifregexp, str);
    for (const match of matches) {
        const find = match[0].trim();
        const condition = match[1];

        let replaceStr = (htmlTemplates.if as (inner: string) => string)(condition);
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    // ENDIF ELSE ENDFOR
    matches = preg_match_all(tagregexp, str);
    for (const match of matches) {
        const find = match[0].trim();
        const tag = match[1];
        const closeTag: Record<string, string> = {
            endif: htmlTemplates.endif as string,
            else: htmlTemplates.else as string,
            endfor: htmlTemplates.endfor as string,
        };

        let replaceStr = closeTag[tag] ?? '';
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    // END ELSE
    matches = preg_match_all(closeElseRegexp, str);
    for (const match of matches) {
        const find = match[0].trim();
        const inner = match[1];

        let replaceStr = (htmlTemplates.endelse as (inner: string) => string)(inner);
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    // END IF
    matches = preg_match_all(closeIfRegexp, str);
    for (const match of matches) {
        const find = match[0].trim();
        const inner = match[1];

        let replaceStr = (htmlTemplates.endiftrue as (inner: string) => string)(inner);
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    // FOR
    matches = preg_match_all(forregexp, str);
    for (const match of matches) {
        const find = match[0].trim();
        const itProp = match[1];
        const inProp = match[2];

        let replaceStr = (htmlTemplates.for as (itProp: string, inProp: string) => string)(itProp, inProp);
        if (converter) {
            replaceStr = converter(replaceStr);
        }
        str = str.replaceAll(find, replaceStr);
    }

    return str;
}

function findIf(jsonObject: unknown, prevResults: IfElement[] = []): IfElement[] {
    if (Array.isArray(jsonObject)) {
        for (const arrayObject of jsonObject) {
            findIf(arrayObject, prevResults);
        }
    } else if (typeof jsonObject === 'object' && jsonObject !== null) {
        const obj = jsonObject as Record<string, unknown>;
        if (obj.component === 'if') {
            const { condition } = (obj.properties as Record<string, string>) ?? {};

            const variants: { true?: unknown; false?: unknown } = {};
            const childrens = obj.children as Record<string, unknown>[];
            if (Array.isArray(childrens)) {
                for (const variant of childrens) {
                    if (variant.component === 'true') {
                        variants.true = variant.children;
                    } else if (variant.component === 'false') {
                        variants.false = variant.children;
                    }
                }
            }

            prevResults.push({
                jsonObject: obj,
                condition: condition ?? '',
                ...variants,
            });
        } else {
            for (const name in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, name)) {
                    const value = obj[name];
                    if (typeof value === 'object') {
                        findIf(value, prevResults);
                    }
                }
            }
        }
    }

    return prevResults;
}

function clearTextForRegExp(text = ''): RegExp {
    let newText = text;

    newText = newText.replaceAll('[', '\\[');
    newText = newText.replaceAll(']', '\\]');
    newText = newText.replaceAll('/', '\\/');

    const allLines = newText.split('\n');

    let regExpText = '';
    for (let i = 0; i < allLines.length; i++) {
        regExpText += `\\s*${allLines[i].trim()}`;
    }

    return new RegExp(regExpText, 'gm');
}

function if2twig(data: IfElement): string {
    const twigTemplates = {
        if: (condition: string, trueValue: string) => `{% if ${condition} %} ${trueValue} {% endif %}\n`,
        ifElse: (condition: string, trueValue: string, falseValue: string) =>
            `{% if ${condition} %} ${trueValue} {% else %} ${falseValue} {% endif %}\n`,
    };

    // eslint-disable-next-line prefer-regex-literals
    const regExp = new RegExp('\\[([\\w\\W\\s]*)\\]', 'gm');

    const safeStringify = (val: unknown): string => {
        const str = JSON.stringify(val, null, '    ');
        const matches = preg_match_all(regExp, str);
        return matches[0]?.[1] ?? str;
    };

    const trueTemplate = safeStringify(data.true);
    if (data.false !== undefined) {
        const falseTemplate = safeStringify(data.false);
        return twigTemplates.ifElse(data.condition, trueTemplate, falseTemplate);
    }

    return twigTemplates.if(data.condition, trueTemplate);
}

function json2twig(data: string): string | false {
    let oldData = JSON.stringify(JSON.parse(data), null, '    ');

    try {
        const newData = JSON.parse(data);
        const ifData = findIf(newData);
        for (const ifElement of ifData) {
            const ifjson = JSON.stringify(ifElement.jsonObject, null, '    ');
            const ifjsonRegExp = clearTextForRegExp(ifjson);
            const twigif = if2twig(ifElement);

            oldData = oldData.replaceAll(ifjsonRegExp, twigif);
        }

        return oldData;
    } catch (e) {
        console.log(e);
    }
    return false;
}

function fromTwig(data: string, converter?: (str: string) => string): string {
    let type: 'twig2html' | 'html2json' = 'twig2html';
    try {
        JSON.parse(data);
    } catch (_e) {
        type = 'html2json';
    }

    let str = data;
    if (type === 'twig2html') {
        str = twig2html(data, converter);
    } else if (type === 'html2json') {
        str = html2json(data, converter);
    }

    return str;
}

export { fromTwig, twig2html, html2json, json2twig, preg_match_all };

/**
 //twig
 if elseif else endif

 //jsx
 <if condition={"..."}>
 <.../>
 <else>
 <.../>
 </else>
 </if>

 //json
 {
    cmp: if,
    props: {
        condition : ""
    },
    children: [
        true: [
            ...
        ]
        false: [
            //else
            ...
        ]
    ]
 }

 * */