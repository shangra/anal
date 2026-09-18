import { Button } from 'ui-kit';
import { EditIcon } from 'components/MetadataForms/Icons/edit.icon';
import $windows from 'components/WindowsCMP/windows.helper';
import { General } from 'components/MetadataForms/Buttons/General';
import { createEditForm } from 'components/MetadataForms/Buttons/Edit/edit.helper'; 

export class Edit extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Add обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'Редактировать';
        this.title = this.props?.title ?? 'Редактировать';

        this.state = {
            element: undefined,
            disable: true,
            type: this.props.type ?? 'icon',
        };
        this.initState('EDIT');
    }

    onClick = (e) => {
        e.stopPropagation();
        const formConfig = createEditForm(this.DataManager); 
        $windows.open(formConfig.title, formConfig.content, formConfig.options);
    };

    calculateDisableState = (selectedRows) => !selectedRows || selectedRows.length !== 1

    render() {
        return (
            <Button
                title={this.title}
                leftIcon={EditIcon}
                onClick={this.onClick}
                disabled={this.state.disable}
                color="primary"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}