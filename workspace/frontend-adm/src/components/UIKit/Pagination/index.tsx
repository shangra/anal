import { Component } from 'react';
import { Pagination as PaginationComponent, PaginationProps as PaginationComponentProps } from "ui-kit"

export class Pagination extends Component<PaginationComponentProps> {
    render = () => (
        <PaginationComponent {...this.props} />
    )
}

export type PaginationProps = PaginationComponentProps