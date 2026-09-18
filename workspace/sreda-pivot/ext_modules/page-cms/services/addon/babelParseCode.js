const generate = require('@babel/generator');
const babel = require('@babel/core');
const { parse } = require('@babel/parser');

class BabelParseCode {
    constructor(options) {
        this.wrapper = options?.wrapper ? options.wrapper : (value) => value;
    }

    async freeComments(code, options = {}) {
        const TemplateScript = babel.transformSync(code, {
            comments: false,
            ...options,
            plugins: ['@babel/plugin-transform-react-jsx'],
        }).code;
        return TemplateScript;
    }

    async jsxToJs(code) {
        //
        const result = babel.transformSync(code, {
            comments: false,
            plugins: ['@babel/plugin-transform-react-jsx'], // ['jsx', 'flow', 'typescript'], //
        });
        return result.code;
    }

    async generateCode(astCode) {
        const ast = {
            type: 'Program',
            body: Array.isArray(astCode) ? astCode : [astCode],
        };

        let { code } = generate.default(ast, { sourceMaps: true });

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
                const newName = splittingComponent
                    .filter((val) => val !== 'Components')
                    .join('__');
                splittingComponent = ['Components', newName];
                newComponent = splittingComponent.join('.');
            }
            code = code.replaceAll(
                `React.createElement(${component},`,
                `React.createElement(${newComponent},`
            );
        });

        return this.wrapper(code);
    }

    async getFunctionParams(params) {
        //
        const result = {};
        for (const param of params) {
            if (param.type === 'AssignmentPattern') {
                // Параметр со значением по умолчанию
                result[param.left.name] = await this.generateCode(param.right);
            } else {
                result[param.name] = null;
            }
        }
        return result;
    }

    async scriptParse(code) {
        const TemplateScript = await this.freeComments(code);

        const ast = parse(TemplateScript, {
            allowAwaitOutsideFunction: true,
            plugins: ['jsx', 'flow'],
        });

        const varsPrimitive = {};
        const vars = {};
        const classes = {};
        const functions = {};

        for (const val of ast.program.body) {
            //
            if (val.type === 'VariableDeclaration') {
                for (const Variable of val.declarations) {
                    if (Variable.init.type === 'ArrowFunctionExpression') {
                        functions[Variable.id.name] = {
                            params: await this.getFunctionParams(
                                Variable.init.params
                            ),
                            code: await this.generateCode(Variable.init.body),
                        };
                    } else if (Variable.init.value) {
                        varsPrimitive[Variable.id.name] = Variable.init.value;
                    } else {
                        vars[Variable.id.name] = {
                            await: Variable.init.type === 'AwaitExpression',
                            code: await this.generateCode(
                                val.declarations[0].init
                            ),
                        };
                    }
                }
            } else if (val.type === 'FunctionDeclaration') {
                functions[val.id.name] = {
                    params: await this.getFunctionParams(val.params),
                    code: await this.generateCode(val.body),
                };
            } else if (val.type === 'ClassDeclaration') {
                classes[val.id.name] = {
                    superClass: val.superClass && val.superClass.name,
                    code: await this.generateCode(val.body),
                };
            }
        }
        return { varsPrimitive, classes, functions, vars };
    }
}

module.exports = BabelParseCode;
