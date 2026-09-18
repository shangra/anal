import { Component } from 'react';
import {
    Typography as TypographyComponent,
    TypographyProps as TypographyComponentProps
} from 'ui-kit'

export class Typography extends Component<TypographyComponentProps, {}> {
    render = () => (
        <TypographyComponent {...this.props} />
    )
}

export type TypographyProps = TypographyComponentProps