declare module '*.module.css' {
    interface IClassNames {
        [className: string]: string;
    }
    const classNames: IClassNames;
    export = classNames;
}

declare module '*.css' {
    interface IClassNames {
        [className: string]: string;
    }
    const classNames: IClassNames;
    export = classNames;
}
declare module '*.svg' {
    import React from 'react';

    const SVG: React.VFC<React.SVGProps<SVGSVGElement>>;
    export default SVG;
}

declare module 'flowdemoRemote/FlowdemoProcess' {
    import type { ComponentType } from 'react';
    import type { ProcessAppProps } from 'components/Flowdemo/contract';

    const ProcessApp: ComponentType<ProcessAppProps>;
    export default ProcessApp;
}


declare module '.png';
declare module '.jng';
declare module '.jpeg';
declare module '.jpg';
