import React from 'react';

import { CanvasTableContext } from './types';
import { ViewportCacheProvider } from './ViewportCacheContext';

const initialValue: CanvasTableContext = {} as CanvasTableContext;
export const CanvasSpreadSheetContext = React.createContext<CanvasTableContext>(initialValue);

export const CanvasSpreadSheetProvider: React.FC<{
    value: CanvasTableContext;
    children: React.ReactNode;
}> = ({ value, children }) => (
    <CanvasSpreadSheetContext.Provider value={value}>
        <ViewportCacheProvider>{children}</ViewportCacheProvider>
    </CanvasSpreadSheetContext.Provider>
);
