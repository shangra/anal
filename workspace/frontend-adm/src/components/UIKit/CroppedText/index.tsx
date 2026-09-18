import { Component } from 'react';
import { CroppedText as CroppedTextComponent, CroppedTextProps as CroppedTextComponentProps} from 'ui-kit'

export class CroppedText extends Component<CroppedTextComponentProps> {
    render = () => (
        <CroppedTextComponent {...this.props} />
    )
}

export type CroppedTextProps = CroppedTextComponentProps