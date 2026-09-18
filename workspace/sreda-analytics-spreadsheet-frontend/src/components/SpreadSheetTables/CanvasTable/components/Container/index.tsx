import React, { FC, PropsWithChildren, useContext } from 'react';

import { CanvasSpreadSheetContext } from '../../context';

export const Container: FC<PropsWithChildren> = ({ children }) => {
    const { theme, width, height } = useContext(CanvasSpreadSheetContext);

    return <div style={{ position: 'relative', width, height, background: theme.bgColor }}>{children}</div>;
};
