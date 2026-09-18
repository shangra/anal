import { Component, type ReactNode } from 'react';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import type { FormComponentProps } from 'components/Inspector/types';

export class FormQueryBuilder extends Component<FormComponentProps> {
    render(): ReactNode {
        const { data } = this.props;

        return (
            <FormInputWrapper description={data.description}>
                <span style={{ color: 'SandyBrown' }}>QueryBuilder</span>
            </FormInputWrapper>
        );
    }
}
