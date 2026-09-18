import React from 'react';

import { CanvasTable } from '../../SpreadSheetTables/CanvasTable';
import { ICanvasTableAPI } from '../../SpreadSheetTables/CanvasTable/types';
import { ISpreadSheet, ITableAPI } from '../types';

export const CanvasTableAdapter: React.FC<ISpreadSheet<ITableAPI>> = ({ tableAPIRef, ...props }) => (
    <CanvasTable ref={tableAPIRef as React.RefObject<ICanvasTableAPI>} {...props} enablePerformanceMonitoring={false} />
);

CanvasTableAdapter.displayName = 'CanvasTableAdapter';
