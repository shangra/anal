import { Component } from 'react';
import { Breadcrumbs as BreadcrumbsComponent, BreadcrumbsProps as BreadcrumbsComponentProps } from 'ui-kit';

export class Breadcrumbs extends Component<BreadcrumbsComponentProps> {
    render() {
        return <BreadcrumbsComponent {...this.props} />;
    }
}

export type BreadcrumbsProps = BreadcrumbsComponentProps;
