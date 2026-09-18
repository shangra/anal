import { CSSProperties, ReactNode } from "react";
import { DEFAULT_COLUMN_WIDTH, DEFAULT_ROW_HEIGHT } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants";
import { HeaderCell } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/components/HeaderCell/HeaderCell";

export class HeaderCellBuilder {
    resizable: boolean;

    columnIndex: number = 0;

    styles: CSSProperties = {
        left: 0,
        top: 0,
        width: DEFAULT_COLUMN_WIDTH,
        height: DEFAULT_ROW_HEIGHT
    };

    name: string = '';

    order: "ASC" | "DESC" | null = null;

    onClick?: () => void;

    resizeStartHandler?: (startX: number) => void;

    resizeHandler?: (clientX: number) => void;

    resizeEndHandler?: () => void;

    sortHandler?: (value: "ASC" | "DESC") => void;

    renderContent?: () => ReactNode;

    constructor() {
        this.resizable = false;
        this.resizeStartHandler = () => {};
        this.resizeHandler = () => {};
        this.resizeEndHandler  = () => {};
        this.sortHandler = () => {};
        this.styles = {
            left: 0,
            top: 0,
            width: DEFAULT_COLUMN_WIDTH,
            height: DEFAULT_ROW_HEIGHT
        };
    }

    withResize(
        startResizeHandler: (startX: number) => void,
        resizeHandler: (clientX: number) => void,
        endResizeHandler: () => void
    ): HeaderCellBuilder {
        this.resizable = true;
        this.resizeStartHandler = startResizeHandler;
        this.resizeHandler = resizeHandler;
        this.resizeEndHandler = endResizeHandler;

        return this;
    }

    withSort(order: "ASC" | "DESC" | null, sortHandler: (value: "ASC" | "DESC") => void): HeaderCellBuilder {
        this.order = order;
        this.sortHandler = sortHandler;
        return this;
    }

    withName(name: string): HeaderCellBuilder {
        this.name = name;
        return this;
    }

    withMouseEvents({ onClick }: { onClick?: () => void }): HeaderCellBuilder {
        this.onClick = onClick;
        return this;
    }

    withStyles(styles: CSSProperties): HeaderCellBuilder {
        this.styles = styles
        return this;
    }

    withRenderContent(renderContent: () => ReactNode): HeaderCellBuilder {
        this.renderContent = renderContent;
        return this;
    }

    build() {
        return (
            <HeaderCell
                name={this.name}
                orderValue={this.order}
                onSort={this.sortHandler}
                styles={this.styles}
                resizable={this.resizable}
                handleResizeStart={this.resizeStartHandler}
                handleResize={this.resizeHandler}
                handleResizeEnd={this.resizeEndHandler}
                onClick={this.onClick}
                renderContent={this.renderContent}
            />
        )
    }
}