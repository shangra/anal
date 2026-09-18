import { Component, createRef, CSSProperties, ReactNode, RefObject } from 'react';

interface ICellProps {
    styles: CSSProperties;
    value: string;
    type?: string;
    renderContent?: () => ReactNode;
    onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onDoubleClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    dataActive?: string;
}

interface ICellState {
    initial: boolean;
    showMoreButton: boolean;
    show: boolean;
}

export class Cell extends Component<ICellProps, ICellState> {
    contentRf: RefObject<HTMLDivElement>;

    constructor(props: Readonly<ICellProps>) {
        super(props);

        this.contentRf = createRef();
        this.state = {
            initial: false,
            showMoreButton: false,
            show: false,
        };
    }

    componentDidMount(): void {
        const element = this.contentRf.current;

        if (element && element.offsetWidth > Number(this.props.styles.width)) {
            this.setState({
                initial: true,
                showMoreButton: true,
            });
        }
    }

    onClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();

        this.setState((prevState) => ({
            show: !prevState.show,
        }));
    };

    handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        switch (event.detail) {
            case 1: {
                this.props.onClick?.(event)
                break;
            }
            case 2: {
                this.props.onDoubleClick?.(event)
                break;
            }
        }
    }

    render(): ReactNode {
        return (
            <div
                style={this.props.styles}
                onClick={this.handleClick}
                // onDoubleClick={(event) => {
                //     this.props.onDoubleClick?.(event);
                // }}
                data-active={this.props.dataActive ? 'true' : 'false'}
            >
                {this.props.renderContent 
                    ? this.props.renderContent() 
                    : <div title={this.props.value}>{this.props.value}</div>
                }
            </div>
        );
    }
}
