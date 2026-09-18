const fs = require('fs');

const buildRoutes = (componentList, outputFile) => {
    const functionGetRoutes = [
        'export const ExtRoutes = () => { return <Routes>',
        '           <Route path="{{path}}" element={ <{{element}} />} />',
        '        </Routes> }',
    ];

    const Routers = [];

    const defaultImportList = ['import React from "react";', 'import { Route, Routes } from "react-router-dom";', ''];

    const importRoutersList = componentList
        .map((component) => {
            const importList = Object.keys(component.routes)
                .map((path) => {
                    const route = component.routes[path];
                    let selfRoute = route.router.replaceAll('.', '_');
                    selfRoute = selfRoute.charAt(0).toUpperCase() + selfRoute.slice(1);

                    let routeLine = functionGetRoutes[1];
                    routeLine = routeLine.replaceAll('{{path}}', path);
                    routeLine = routeLine.replaceAll('{{element}}', selfRoute);
                    Routers.push(routeLine);

                    return `import ${selfRoute} from "./${component.packagePath}/routers/${route.router}";`;
                })
                .join('\n');
            return importList;
        })
        .filter((route) => !!route);

    const routersString = Routers.join('\n');
    const constructorRouters = [
        defaultImportList.join('\n'),
        importRoutersList.join('\n'),
        '',
        functionGetRoutes[0],
        routersString,
        functionGetRoutes[2],
    ];
    const routersFile = constructorRouters.join('\n');

    fs.writeFileSync(outputFile, routersFile);
};

module.exports = {
    buildRoutes,
};
