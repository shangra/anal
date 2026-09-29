import { forwardRef, useContext } from 'react';
import { ArrowLeftIcon, IconButton } from 'ui-kit';
import { HeaderCellBuilder } from './HeaderCell/HeaderCellBuilder';
import { DEFAULT_ROW_HEIGHT, HIERARCHY_COLUMN_WIDTH } from '../constants';
import { TableContext } from '../TableContext';
import type { IInnerGridElementProps } from '../types';

export const InnerGridElement = forwardRef<HTMLDivElement, IInnerGridElementProps>(
    function InnerGridElement({ children, style }, ref) {
        const {
            cols,
            onSort,
            handleResize,
            handleResizeEnd,
            handleResizeStart,
            hasColumnsHeader,
            mergedLength,
            hasHierarchy,
            hasExpandedHierarchy,
            onHierarchyBack,
            columnsMetadata,
        } = useContext(TableContext);

        return (
            <div ref={ref} style={{ ...style }}>
                {hasColumnsHeader ? (
                    <div
                        style={{
                            position: 'sticky',
                            top: 0,
                            left: '0px',
                            width: '100%',
                            zIndex: 11,
                        }}
                    >
                        <div style={{ display: 'flex' }}>
                            {hasHierarchy
                                ? (() => {
                                      let builder = new HeaderCellBuilder().withStyles({
                                          position: 'absolute',
                                          left: 0,
                                          width: HIERARCHY_COLUMN_WIDTH,
                                          height: DEFAULT_ROW_HEIGHT * mergedLength,
                                      });
                                      if (hasExpandedHierarchy) {
                                          builder = builder.withRenderContent(() => (
                                              <div
                                                  style={{
                                                      display: 'flex',
                                                      gap: '10px',
                                                      alignItems: 'center',
                                                      width: '100%',
                                                      height: '100%',
                                                  }}
                                              >
                                                  <IconButton
                                                      variant="outlined"
                                                      icon={ArrowLeftIcon}
                                                      onClick={() => onHierarchyBack?.()}
                                                      size="small"
                                                  />
                                                  <div>Иерархия</div>
                                              </div>
                                          ));
                                      } else {
                                          builder = builder.withName('Иерархия');
                                      }

                                      return builder.build();
                                  })()
                                : null}
                            {cols.map((column, columnIndex) => {
                                const columnMetadata = columnsMetadata[columnIndex];
                                if (!columnMetadata) return null;

                                if (Array.isArray(column)) {
                                    return (
                                        <div
                                            key={`group-${columnIndex}`}
                                            style={{
                                                position: 'absolute',
                                                left: hasHierarchy
                                                    ? columnMetadata.x + HIERARCHY_COLUMN_WIDTH
                                                    : columnMetadata.x,
                                                width: columnMetadata.width,
                                                height: DEFAULT_ROW_HEIGHT * mergedLength,
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            {column.map((columnData, idx) => {
                                                const headerCellBuilder = new HeaderCellBuilder()
                                                    .withName(columnData.label ?? columnData.name)
                                                    .withStyles({
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRight: '1px solid var(--table-border-color)',
                                                    })
                                                    .withResize(
                                                        (startX) => handleResizeStart(columnIndex, startX),
                                                        handleResize,
                                                        handleResizeEnd,
                                                    )
                                                    .withSort(columnData.order ?? null, (value) => {
                                                        onSort?.(columnData.name, value);
                                                    });

                                                return (
                                                    <div
                                                        key={`${columnData.name}-${idx}`}
                                                        style={{
                                                            flex: 1,
                                                            height: DEFAULT_ROW_HEIGHT,
                                                            minHeight: DEFAULT_ROW_HEIGHT,
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {headerCellBuilder.build()}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }

                                return new HeaderCellBuilder()
                                    .withStyles({
                                        width: columnMetadata.width,
                                        left: hasHierarchy
                                            ? columnMetadata.x + HIERARCHY_COLUMN_WIDTH
                                            : columnMetadata.x,
                                        height: DEFAULT_ROW_HEIGHT * mergedLength,
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        borderRight: '1px solid var(--table-border-color)',
                                    })
                                    .withSort(column.order ?? null, (value) => {
                                        onSort?.(column.name, value);
                                    })
                                    .withName(column.label ?? column.name)
                                    .withResize(
                                        (startX) => handleResizeStart(columnIndex, startX),
                                        handleResize,
                                        handleResizeEnd,
                                    )
                                    .build();
                            })}
                        </div>
                    </div>
                ) : null}
                <div
                    style={{
                        position: 'absolute',
                        top: DEFAULT_ROW_HEIGHT * mergedLength,
                    }}
                >
                    {children}
                </div>
            </div>
        );
    },
);
