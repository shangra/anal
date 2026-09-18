import { Component } from 'react';
import { TextArea as TextAreaComponent, TextAreaProps as TextAreaComponentProps} from "ui-kit"

export class TextArea extends Component<TextAreaComponentProps> {
    render = () => (
        <TextAreaComponent {...this.props} />
    )
}

export type TextAreaProps = TextAreaComponentProps