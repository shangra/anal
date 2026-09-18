import { Button } from 'ui-kit';
import { CrossLinkIcon } from 'components/MetadataForms/Icons/crosslink.icon';
import { General } from 'components/MetadataForms/Buttons/General';

const MAX_OPEN_TABS = 5;

export class Link extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) {
            console.error('Для работы компонента Link обязателен параметр DataManager!');
        }

        this.formId = this.DataManager.formId;

        this.description = this.props?.description ?? 'Перейти по ссылке';
        this.title = this.props?.title ?? this.description;

        this.state = {
            type: this.props.type ?? 'icon',
        };

        this.initState('LINK');
    }

    calculateDisableState = (selectedRows) =>
        !selectedRows || selectedRows.length === 0 || selectedRows.length > MAX_OPEN_TABS;

    handleClick = (e) => {
        e.stopPropagation();

        const dm = this.DataManager;
        const selectedRows = dm.selectedRows;
        if (!selectedRows || selectedRows.length === 0) return;

        const base = dm.metadata?.manifest?.settings?.baseurl || '/';
        const rowsToOpen = selectedRows.slice(0, MAX_OPEN_TABS);

        rowsToOpen.forEach((row) => {
            const uri = row.uri || '';
            const url = this.buildUrl(base, uri);
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    };

    buildUrl = (base, path) => {
        const trimmedBase = base.replace(/\/+$/, '');
        const trimmedPath = path.replace(/^\/+/, '');
        if (!trimmedPath) return trimmedBase || '/';
        return `${trimmedBase}/${trimmedPath}`;
    };

    render() {
        return (
            <Button
                title={this.title}
                leftIcon={CrossLinkIcon}
                onClick={this.handleClick}
                disabled={this.state.disable}
                color="secondary"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
