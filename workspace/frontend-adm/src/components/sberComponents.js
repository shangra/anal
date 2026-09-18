import * as CONSTANTS from './constants';
import * as Components from './index';
import * as UTILITIES from './utilities';

import React, { Component, Fragment } from 'react';

import $api from '../helpers/axios';
import { ApiError } from './ApiError';
import generate from '@babel/generator';
import { lookup } from 'mime-types';
import { parse } from '@babel/parser';

const globalThis = window;

const DOMAttribute = {
    acceptcharset: 'acceptCharset',
    accesskey: 'accessKey',
    allowfullscreen: 'allowFullScreen',
    autocomplete: 'autoComplete',
    autofocus: 'autoFocus',
    autoplay: 'autoPlay',
    cellpadding: 'cellPadding',
    cellspacing: 'cellSpacing',
    charset: 'charSet',
    classid: 'classID',
    classname: 'className',
    colspan: 'colSpan',
    contenteditable: 'contentEditable',
    contextmenu: 'contextMenu',
    controlslist: 'controlsList',
    crossorigin: 'crossOrigin',
    datetime: 'dateTime',
    enctype: 'encType',
    formaction: 'formAction',
    formenctype: 'formEncType',
    formmethod: 'formMethod',
    formnovalidate: 'formNoValidate',
    formtarget: 'formTarget',
    frameborder: 'frameBorder',
    hreflang: 'hrefLang',
    htmlfor: 'htmlFor',
    httpequiv: 'httpEquiv',
    inputmode: 'inputMode',
    keyparams: 'keyParams',
    keytype: 'keyType',
    marginheight: 'marginHeight',
    marginwidth: 'marginWidth',
    maxlength: 'maxLength',
    mediagroup: 'mediaGroup',
    minlength: 'minLength',
    novalidate: 'noValidate',
    radiogroup: 'radioGroup',
    readonly: 'readOnly',
    rowspan: 'rowSpan',
    spellcheck: 'spellCheck',
    srcdoc: 'srcDoc',
    srclang: 'srcLang',
    srcset: 'srcSet',
    tabindex: 'tabIndex',
    usemap: 'useMap',
};
const SVGAttribute = {
    accentheight: 'accentHeight',
    alignmentbaseline: 'alignmentBaseline',
    allowreorder: 'allowReorder',
    arabicform: 'arabicForm',
    attributename: 'attributeName',
    attributetype: 'attributeType',
    autoreverse: 'autoReverse',
    basefrequency: 'baseFrequency',
    baseprofile: 'baseProfile',
    baselineshift: 'baselineShift',
    calcmode: 'calcMode',
    capheight: 'capHeight',
    clippath: 'clipPath',
    clippathunits: 'clipPathUnits',
    cliprule: 'clipRule',
    colorinterpolation: 'colorInterpolation',
    colorinterpolationfilters: 'colorInterpolationFilters',
    colorprofile: 'colorProfile',
    colorrendering: 'colorRendering',
    contentscripttype: 'contentScriptType',
    contentstyletype: 'contentStyleType',
    diffuseconstant: 'diffuseConstant',
    dominantbaseline: 'dominantBaseline',
    edgemode: 'edgeMode',
    enablebackground: 'enableBackground',
    externalresourcesrequired: 'externalResourcesRequired',
    fillopacity: 'fillOpacity',
    fillrule: 'fillRule',
    filterres: 'filterRes',
    filterunits: 'filterUnits',
    floodcolor: 'floodColor',
    floodopacity: 'floodOpacity',
    fontfamily: 'fontFamily',
    fontsize: 'fontSize',
    fontsizeadjust: 'fontSizeAdjust',
    fontstretch: 'fontStretch',
    fontstyle: 'fontStyle',
    fontvariant: 'fontVariant',
    fontweight: 'fontWeight',
    glyphname: 'glyphName',
    glyphorientationhorizontal: 'glyphOrientationHorizontal',
    glyphorientationvertical: 'glyphOrientationVertical',
    glyphref: 'glyphRef',
    gradienttransform: 'gradientTransform',
    gradientunits: 'gradientUnits',
    horizadvx: 'horizAdvX',
    horizoriginx: 'horizOriginX',
    imagerendering: 'imageRendering',
    kernelmatrix: 'kernelMatrix',
    kernelunitlength: 'kernelUnitLength',
    keypoints: 'keyPoints',
    keysplines: 'keySplines',
    keytimes: 'keyTimes',
    lengthadjust: 'lengthAdjust',
    letterspacing: 'letterSpacing',
    lightingcolor: 'lightingColor',
    limitingconeangle: 'limitingConeAngle',
    markerend: 'markerEnd',
    markerheight: 'markerHeight',
    markermid: 'markerMid',
    markerstart: 'markerStart',
    markerunits: 'markerUnits',
    markerwidth: 'markerWidth',
    maskcontentunits: 'maskContentUnits',
    maskunits: 'maskUnits',
    numoctaves: 'numOctaves',
    overlineposition: 'overlinePosition',
    overlinethickness: 'overlineThickness',
    paintorder: 'paintOrder',
    pathlength: 'pathLength',
    patterncontentunits: 'patternContentUnits',
    patterntransform: 'patternTransform',
    patternunits: 'patternUnits',
    pointerevents: 'pointerEvents',
    pointsatx: 'pointsAtX',
    pointsaty: 'pointsAtY',
    pointsatz: 'pointsAtZ',
    preservealpha: 'preserveAlpha',
    preserveaspectratio: 'preserveAspectRatio',
    primitiveunits: 'primitiveUnits',
    refx: 'refX',
    refy: 'refY',
    renderingintent: 'renderingIntent',
    repeatcount: 'repeatCount',
    repeatdur: 'repeatDur',
    requiredextensions: 'requiredExtensions',
    requiredfeatures: 'requiredFeatures',
    shaperendering: 'shapeRendering',
    specularconstant: 'specularConstant',
    specularexponent: 'specularExponent',
    spreadmethod: 'spreadMethod',
    startoffset: 'startOffset',
    stddeviation: 'stdDeviation',
    stitchtiles: 'stitchTiles',
    stopcolor: 'stopColor',
    stopopacity: 'stopOpacity',
    strikethroughposition: 'strikethroughPosition',
    strikethroughthickness: 'strikethroughThickness',
    strokedasharray: 'strokeDasharray',
    strokedashoffset: 'strokeDashoffset',
    strokelinecap: 'strokeLinecap',
    strokelinejoin: 'strokeLinejoin',
    strokemiterlimit: 'strokeMiterlimit',
    strokeopacity: 'strokeOpacity',
    strokewidth: 'strokeWidth',
    surfacescale: 'surfaceScale',
    systemlanguage: 'systemLanguage',
    tablevalues: 'tableValues',
    targetx: 'targetX',
    targety: 'targetY',
    textanchor: 'textAnchor',
    textdecoration: 'textDecoration',
    textlength: 'textLength',
    textrendering: 'textRendering',
    underlineposition: 'underlinePosition',
    underlinethickness: 'underlineThickness',
    unicodebidi: 'unicodeBidi',
    unicoderange: 'unicodeRange',
    unitsperem: 'unitsPerEm',
    valphabetic: 'vAlphabetic',
    vhanging: 'vHanging',
    videographic: 'vIdeographic',
    vmathematical: 'vMathematical',
    vectoreffect: 'vectorEffect',
    vertadvy: 'vertAdvY',
    vertoriginx: 'vertOriginX',
    vertoriginy: 'vertOriginY',
    viewbox: 'viewBox',
    viewtarget: 'viewTarget',
    wordspacing: 'wordSpacing',
    writingmode: 'writingMode',
    xchannelselector: 'xChannelSelector',
    xheight: 'xHeight',
    xlinkactuate: 'xlinkActuate',
    xlinkarcrole: 'xlinkArcrole',
    xlinkhref: 'xlinkHref',
    xlinkrole: 'xlinkRole',
    xlinkshow: 'xlinkShow',
    xlinktitle: 'xlinkTitle',
    xlinktype: 'xlinkType',
    xmlnsxlink: 'xmlnsXlink',
    xmlbase: 'xmlBase',
    xmllang: 'xmlLang',
    xmlspace: 'xmlSpace',
    ychannelselector: 'yChannelSelector',
    zoomandpan: 'zoomAndPan',
};

// TODO доделать вывод стрелочных функций в прототип объекта
class ArrowFunctionExpression {
    constructor(args, body) {
        this.args = args;
        this.body = body;
    }

    wrapper(value) {
        return value; // Buffer.from(value).toString('base64');
    }

    generateCode(astCode) {
        const ast = {
            type: 'Program',
            body: Array.isArray(astCode) ? astCode : [astCode],
        };

        let { code } = generate(ast, { sourceMaps: true });

        const componentsFind = [];
        const regexp = /React\.createElement\((?<Component>[a-zA-Z0-9\.]+),/gm;
        const matches = [...code.matchAll(regexp)];
        for (const key in matches) {
            const match = matches[key];
            const component = match.groups.Component.trim();
            componentsFind.push(component);
        }

        componentsFind.forEach((component) => {
            //
            let newComponent = component;
            let splittingComponent = newComponent.split('.');

            // Сделано для работы компонентов React.Suspense, React.Fragment
            if (splittingComponent[0] !== 'React') {
                const newName = splittingComponent.filter((val) => val !== 'Components').join('__');
                splittingComponent = ['Components', newName];
                newComponent = splittingComponent.join('.');
            }
            code = code.replaceAll(`React.createElement(${component},`, `React.createElement(${newComponent},`);
        });

        return this.wrapper(code);
    }

    execute(owner) {
        const funcCode = this.generateCode(this.body);
        const func = CreateFunction.code(this.args, funcCode.slice(1, -1), owner);
        return func;
    }
}

class babelConverter {
    constructor(Context) {
        this.Context = Context ?? {};
    }

    getComponent(componentName) {
        let result = this.Context.CMP.GetComponent(`Components.${componentName}`);
        if (result === '') {
            result = this.Context.CMP.GetComponent(`${componentName}`);
        }
        return result === '' ? undefined : result;
    }

    parseIdentifier(Node, getText = false) {
        let result = this.Context[Node.name];
        if (!getText) {
            result = result ?? this.getComponent(Node.name);
        }
        return result ?? Node.name;
    }

    parseMemberExpression(callee, level = 0) {
        let Obj;
        switch (callee.object.type) {
            case 'ThisExpression': {
                Obj = this.Context.owner;
                break;
            }
            case 'MemberExpression': {
                Obj = this.parseMemberExpression(callee.object, level + 1);
                break;
            }
            case 'Identifier': {
                Obj = this.parseIdentifier(callee.object, true);
                break;
            }
            case 'ArrayExpression': {
                Obj = this.parseArrayExpression(callee.object);
                break;
            }
        }

        const Func = callee.property.name;

        let func;
        if (level === 0 && typeof Obj === 'string') {
            func = this.getComponent(`${Obj}.${Func}`);
        } else if (level === 0 && Array.isArray(Obj)) {
            func = Obj ? { Obj, Func } : undefined;
        } else {
            func = Obj && typeof Obj === 'string' ? `${Obj}.${Func}` : Obj[Func];
            func = typeof func === 'function' ? func.bind(this.Context.owner) : func;
        }
        return func;
    }

    parseCallExpression(expression) {
        let result;
        switch (expression.callee.type) {
            case 'MemberExpression': {
                const functionLink = this.parseMemberExpression(expression.callee);
                const args = this.parseNode(expression.arguments);
                if (typeof functionLink === 'function') {
                    if (typeof args === 'function') {
                        result = functionLink(args);
                    } else if (Array.isArray(args)) {
                        result = functionLink(...args);
                    }
                } else if (typeof functionLink === 'object') {
                    return functionLink.Obj[functionLink.Func](...args);
                }
                break;
            }
        }
        return result;
    }

    parseObjectExpression(Node) {
        const result = this.parseNode(Node.properties, { returnObject: true });
        return result;
    }

    parseArrayExpression(Node) {
        const result = this.parseNode(Node.elements);
        return result;
    }

    parseObjectProperty(Node) {
        let name = Node.key.name ?? Node.key.value;
        name = this.Context?.pkeyTransform?.(name) ?? name;
        const result = {
            [name]: this.parseExpressionStatement(Node.value),
        };
        return result;
    }

    parseBinaryExpression(Node) {
        let result;
        const left = this.parseExpressionStatement(Node.left);
        const right = this.parseExpressionStatement(Node.right);

        switch (Node.operator) {
            case '>': {
                result = left > right;
                break;
            }
            case '<': {
                result = left < right;
                break;
            }
            case '>=': {
                result = left >= right;
                break;
            }
            case '<=': {
                result = left <= right;
                break;
            }
            case '==': {
                result = left == right;
                break;
            }
            case '===': {
                result = left === right;
                break;
            }
            case '!=': {
                result = left != right;
                break;
            }
            case '!==': {
                result = left !== right;
                break;
            }
        }

        return result;
    }

    parseLogicalExpression(Node) {
        let result;
        const left = this.parseExpressionStatement(Node.left);
        const right = this.parseExpressionStatement(Node.right);

        switch (Node.operator) {
            case '&&': {
                // AND
                result = left && right;
                break;
            }
            case '||': {
                result = left || right;
                break;
            }
            case '??': {
                result = left ?? right;
                break;
            }
        }

        return result;
    }

    parseTemplateLiteral(Node) {
        function sortNodes(a, b) {
            return a.start - b.start;
        }

        const result = [];
        const elements = [...Node.expressions, ...Node.quasis].sort(sortNodes);
        for (const expression of elements) {
            result.push(this.parseExpressionStatement(expression));
        }
        return result.join('');
    }

    parseTemplateElement(Node) {
        return Node.value.raw;
    }

    parseArrowFunctionExpression(Node) {
        const args = this.parseNode(Node.params);
        const func = new ArrowFunctionExpression(args, Node.body).execute(this.Context.owner);
        return func;
    }

    UnaryExpression(Node) {
        //
        const argument = this.parseExpressionStatement(Node.argument);

        let result = argument;
        switch (Node.operator) {
            case '!': {
                result = !result;
                break;
            }
        }
        return result;
    }

    ConditionalExpression(Node) {
        const test = this.parseExpressionStatement(Node.test);
        const consequent = this.parseExpressionStatement(Node.consequent);
        const alternate = this.parseExpressionStatement(Node.alternate);

        const result = test ? consequent : alternate;
        return result;
    }

    parseBlockStatement(Node) {
        //
        Node.body;
    }

    parseExpressionStatement(Node) {
        let result;
        switch (Node.type) {
            // case 'BlockStatement': {
            //     result = this.parseBlockStatement(Node);
            //     break;
            // }
            case 'CallExpression': {
                result = this.parseCallExpression(Node);
                break;
            }
            case 'MemberExpression': {
                result = this.parseMemberExpression(Node);
                break;
            }
            case 'NullLiteral': {
                result = null;
                break;
            }
            case 'StringLiteral': {
                result = Node.value;
                break;
            }
            case 'TemplateLiteral': {
                result = this.parseTemplateLiteral(Node);
                break;
            }
            case 'TemplateElement': {
                result = this.parseTemplateElement(Node);
                break;
            }
            case 'BooleanLiteral': {
                result = Node.value;
                break;
            }
            case 'NumericLiteral': {
                result = Node.value;
                break;
            }
            case 'ObjectExpression': {
                result = this.parseObjectExpression(Node);
                break;
            }
            case 'ObjectProperty': {
                result = this.parseObjectProperty(Node);
                break;
            }
            case 'Identifier': {
                // Это реакт компонент или класс
                result = this.parseIdentifier(Node);
                break;
            }
            case 'LogicalExpression': {
                result = this.parseLogicalExpression(Node);
                break;
            }
            case 'BinaryExpression': {
                result = this.parseBinaryExpression(Node);
                break;
            }
            case 'ArrayExpression': {
                result = this.parseArrayExpression(Node);
                break;
            }
            case 'ArrowFunctionExpression': {
                result = this.parseArrowFunctionExpression(Node);
                break;
            }
            case 'ConditionalExpression': {
                result = this.ConditionalExpression(Node);
                break;
            }
            case 'UnaryExpression': {
                result = this.UnaryExpression(Node);
                break;
            }
        }
        return result;
    }

    parseNode(Nodes, options = {}) {
        let result = options.returnObject ? {} : [];
        for (const Node of Nodes) {
            switch (Node.type) {
                case 'ExpressionStatement': {
                    const res = this.parseExpressionStatement(Node.expression);
                    if (options.returnObject) {
                        result = { ...result, ...res };
                    } else result.push(res);
                    break;
                }
                default: {
                    const res = this.parseExpressionStatement(Node);
                    if (options.returnObject) {
                        result = { ...result, ...res };
                    } else result.push(res);
                }
            }
        }

        return result;
    }
}

class CreateFunction {
    //
    static code(args, code, owner = undefined) {
        const paramsArray = args ?? [];
        paramsArray.push('React');
        paramsArray.push('Components');
        paramsArray.push('CONSTANTS');
        paramsArray.push('UTILITIES');
        paramsArray.push('ref');

        const func = new Function(paramsArray.join(' , '), code).bind(owner);
        return (...args) => func(...args, React, Components, CONSTANTS, UTILITIES);
    }
}

class SberFunctions extends Component {
    /**
     * Список функций шаблона страницы
     */
    functions = {};

    convertNameDelimer = (nameDelimer) => {
        let m;
        const rg = /\-(?<letter>[a-zA-Z])/gm;
        const arrMatch = [];
        while ((m = rg.exec(nameDelimer)) !== null) {
            if (m.index === rg.lastIndex) {
                rg.lastIndex++;
            }
            m.forEach((match, groupIndex) => {
                if (groupIndex === 1) {
                    arrMatch.push(match);
                }
            });
        }
        for (const el of arrMatch) {
            nameDelimer = nameDelimer.replaceAll(`-${el}`, el.toUpperCase());
        }
        return nameDelimer;
    };

    convertStyle = (style) => {
        const result = {};
        const arrStyle = style.split(';');

        for (const el of arrStyle) {
            let key = el.substring(0, el.indexOf(':'));
            const value = el.substring(el.lastIndexOf(':') + 1).slice(1);

            key = this.convertNameDelimer(key);

            result[key] = value;
        }
        return result;
    };

    propertyFunction(property, inputRef) {
        const CMP = Components; // for eval;
        const ReactLibrary = React;
        const CONSTANTS_PACK = CONSTANTS;
        const UTILITIES_PACK = UTILITIES;

        const resEval = `(...args) => {
                    const React = ReactLibrary;
                    const Components = CMP;
                    const CONSTANTS = CONSTANTS_PACK;
                    const UTILITIES = UTILITIES_PACK;
                    const ref = inputRef.current;
                    return this.${property}(...args, ReactLibrary, CMP, CONSTANTS, UTILITIES, inputRef.current)
                }`;

        const result = eval(resEval);

        return result;
    }

    propertyTransform(property, pkey, inputRef) {
        let result = property;
        if (typeof property === 'string' && property.indexOf('(e)=>') === 0) {
            property = property.slice(5);
            result = this.propertyFunction(property, inputRef);
        }
        if (typeof property === 'string' && property.indexOf('`') === 0) {
            // Это шаблон
            if (property.indexOf('this') === 1) {
                property = property.slice(6, property.length - 1);
            }
            if (this[property] && typeof this[property] === 'function') {
                result = this.propertyFunction(property, inputRef);
            } else {
                result = eval(`this.${property}`);
            }
        }
        if (typeof property === 'object' && property.__html) {
            result.__html = decodeURIComponent(property.__html);
        }
        if (pkey === 'style' && typeof property === 'string') {
            result = this.convertStyle(property);
        }
        return result;
    }

    pkeyTransform = (pkey) => {
        let result = pkey;

        if (pkey.trim().toLowerCase() === 'class') {
            result = 'className';
        } else if (!(pkey.indexOf('data-') === 0 || pkey.indexOf('aria-') === 0)) {
            result = this.convertNameDelimer(pkey);
            result = DOMAttribute[pkey.trim()] ?? result;
            result = SVGAttribute[pkey.trim()] ?? result;
        }

        return result;
    };

    wrapper(value) {
        return Buffer.from(value, 'base64').toString('utf-8');
    }

    scriptInitialize(script) {
        if (script.varsPrimitive) {
            for (const varName in script.varsPrimitive) {
                const varValue = script.varsPrimitive[varName];
                this[varName] = varValue;
            }
        }

        if (script.classes) {
            for (const className in script.classes) {
                const classValue = script.classes[className];
                const superClass = classValue.superClass ? `extends ${classValue.superClass}` : '';
                const code = this.wrapper(classValue.code);
                this[className] = eval(`(class ${className} ${superClass} ${code})`);
            }
        }

        if (script.functions) {
            for (const functionName in script.functions) {
                const functionValue = script.functions[functionName];
                const paramsArray = [];
                for (const paramName in functionValue.params) {
                    const paramDefault =
                        functionValue.params[paramName] === null ? '' : ` = ${this.wrapper(functionValue.params[paramName])}`;
                    paramsArray.push(`${paramName}${paramDefault}`);
                }
                paramsArray.push('React');
                paramsArray.push('Components');
                paramsArray.push('CONSTANTS');
                paramsArray.push('UTILITIES');
                paramsArray.push('ref');

                const func = new Function(paramsArray.join(' , '), this.wrapper(functionValue.code)).bind(this);
                this[functionName] = (...args) => func(...args, React, Components, CONSTANTS, UTILITIES);
                this.functions[functionName] = ((...args) => func(...args, React, Components, CONSTANTS, UTILITIES));

                if (functionName.toUpperCase() === 'COMPONENTDIDMOUNT') {
                    this[functionName.toUpperCase()] = (...args) => func(...args, React, Components, CONSTANTS, UTILITIES);
                    func(React, Components, CONSTANTS, UTILITIES);
                }
                if (
                    functionName.toUpperCase() === 'COMPONENTDIDUPDATE' ||
                    functionName.toUpperCase() === 'COMPONENTWILLUNMOUNT'
                ) {
                    this[functionName.toUpperCase()] = (...args) => func(...args, React, Components, CONSTANTS, UTILITIES);
                }
            }
        }

        if (script.vars) {
            for (const varName in script.vars) {
                let code = this.wrapper(script.vars[varName].code);
                code = script.vars[varName].await ? `(async () => {return ${code}})()` : `(${code})`;
                this[varName] = eval(code);
            }
        }
    }

    formInitialize(form) {
        const formCode = this.wrapper(form);

        const ast = parse(formCode, {
            allowAwaitOutsideFunction: true,
        });

        const block = new babelConverter({
            React,
            CMP: Components,
            CONSTANTS,
            UTILITIES,
            owner: this,
            pkeyTransform: this.pkeyTransform,
        }).parseNode(ast.program.body);
        return block;
    }

    renderJSON(objects) {
        let result = [];

        for (const key in objects) {
            let cmpobject = objects[key];
            if (typeof cmpobject === 'object') {
                let componentName = cmpobject.component;
                let ReactComponent;
                const LazyComponent = false;
                const LazyComponentId = undefined;
                //
                // if (componentName.indexOf("LazyComponents") === 0) {
                //     LazyComponent = true;
                //     if (cmpobject.properties?.id) {
                //         LazyComponentId = cmpobject.properties?.id
                //         if (LazyComponentId) {
                //             ReactComponent = globalThis.virtualLazyComponents[LazyComponentId];
                //             if (!ReactComponent) {
                //                 componentName = componentName.replaceAll("LazyComponents", "Components");
                //             }
                //         }
                //     }
                // }

                // const firstLetter = componentName.substring(0, 1);
                // else if (firstLetter === firstLetter.toUpperCase()) {
                //     //Это компонент, нужно вернуть его класс
                // }

                if (componentName.indexOf('Components') === 0) {
                    componentName = Components.GetComponent(componentName);
                } else if (componentName[0].toUpperCase() === componentName[0]) {
                    const findComponentName = Components.GetComponent(`Components.${componentName}`);
                    componentName = findComponentName === '' ? componentName : findComponentName;
                }

                if (!ReactComponent) {
                    let children;
                    if (cmpobject.children !== undefined) {
                        children = this.renderJSON(cmpobject.children);
                    }

                    const properties = {
                        key,
                        ref: React.createRef(),
                    };
                    for (const pkey in cmpobject.properties) {
                        const property = cmpobject.properties[pkey];
                        const pkeyT = this.pkeyTransform(pkey);
                        properties[pkeyT] = this.propertyTransform(property, pkeyT, properties.ref);
                    }

                    ReactComponent = React.createElement(componentName, properties, children);
                    if (LazyComponent) {
                        globalThis.virtualLazyComponents[LazyComponentId] = ReactComponent;
                    }
                }

                if (ReactComponent) {
                    result.push(ReactComponent);
                }
            } else {
                cmpobject = this.propertyTransform(cmpobject);
                result.push(cmpobject);
            }
        }

        if (result.length > 1) {
            result = React.createElement(Fragment, { children: result });
        } else {
            result = result[0];
        }

        return result;
    }
}

class SberComponent extends SberFunctions {
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            data: 0,
        };
    }

    render(tagName) {
        const children = [];
        if (this.props.children !== undefined && !Array.isArray(this.props.children)) {
            children.push(this.props.children);
        }

        if (children.length > 0) {
            for (const key in children) {
                let childrenData = children[key];
                if (childrenData.indexOf('`') === 0) {
                    // Это шаблон
                    childrenData = eval(childrenData);
                }
                children[key] = childrenData;
            }
        }

        const newprops = {};
        for (const key in this.props) {
            let prop = this.props[key];
            if (typeof prop === 'string') {
                if (prop.indexOf('()=>') === 0) {
                    prop = eval(prop);
                }
            }
            newprops[key] = prop;
        }

        const block = React.createElement(tagName, newprops, children);

        return block;
    }
}

class SberDynamic extends SberFunctions {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            content: undefined,
        };

        this.reloadComponent = this.reloadComponent.bind(this);
    }

    reloadComponent(jsonFileName) {
        const url = jsonFileName ?? this.props.jsonFileName;
        if (url) {
            const contentType = lookup(url);
            $api.get(url, {
                headers: {
                    'Content-Type': contentType,
                },
            })
                .then((result) => {
                    if (
                        result.headers['content-type'] === 'application/json; charset=utf-8' &&
                        typeof result.data !== 'object'
                    ) {
                        this.setState({
                            isLoaded: true,
                            error: {
                                errorCode: -101,
                                errorInfo: 'Ошибка разбора ответа сервера',
                            },
                        });
                    } else {
                        const form = result.data?.form ?? result.data;

                        if (result.data.script) {
                            this.scriptInitialize(result.data.script);
                        }

                        this.setState({
                            error: null,
                            isLoaded: true,
                            content: form,
                        });
                    }
                })
                .catch((error) => {
                    this.setState({
                        isLoaded: true,
                        error: {
                            errorCode: -100,
                            errorInfo: error,
                        },
                    });
                });
        } else if (this.props.json !== undefined) {
            const form = this.props.json?.form ?? this.props.json;
            if (this.props.json.script) this.scriptInitialize(this.props.json.script);
            this.setState({
                error: null,
                isLoaded: true,
                content: form,
            });
        } else {
            this.setState({
                error: null,
                isLoaded: true,
            });
        }
    }

    componentDidMount() {
        this.setState(
            {
                error: null,
                isLoaded: false,
            },
            () => {
                if (this.props.jsonFileName || this.props.json) {
                    this.reloadComponent();
                }
            },
        );
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (
            prevProps.jsonFileName !== this.props.jsonFileName ||
            JSON.stringify(prevProps.json) !== JSON.stringify(this.props.json)
        ) {
            this.setState(
                {
                    error: null,
                    isLoaded: false,
                },
                () => {
                    if (this.props.jsonFileName || this.props.json) {
                        this.reloadComponent();
                    }
                },
            );
        }
    }
}

class SberDynamicComponent extends SberDynamic {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        if (this.state.isLoaded) {
            if (this.COMPONENTDIDMOUNT) this.COMPONENTDIDMOUNT();
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        super.componentDidUpdate(prevProps, prevState, snapshot);
        if (this.COMPONENTDIDUPDATE) this.COMPONENTDIDUPDATE(prevProps, prevState, snapshot);
    }

    componentWillUnmount() {
        if (this.COMPONENTWILLUNMOUNT) this.COMPONENTWILLUNMOUNT();
    }

    render() {
        const { error, isLoaded, content } = this.state;

        if (error) {
            return <ApiError {...error} />;
        }

        if (content) {
            let block = React.createElement('div');
            if (typeof content === 'string') {
                block = this.formInitialize(content);
            } else if (typeof content === 'object') {
                let form = content;
                if (!Array.isArray(form)) {
                    form = form.form;
                }
                block = this.renderJSON(form);
            }
            return block;
        }
        return <div>Loading...</div>;
    }
}

export { SberFunctions };
export { SberDynamic };
export { SberDynamicComponent };
export { SberComponent };