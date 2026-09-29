import { Component } from 'react';
import { Button, StructureIcon } from 'ui-kit';

export class GraphOpen extends Component {
    resolveFieldId(fieldValue) {
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
            return null;
        }
        if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
            return String(fieldValue);
        }
        if (typeof fieldValue === 'object') {
            if (fieldValue.value !== undefined && fieldValue.value !== null && fieldValue.value !== '') {
                return String(fieldValue.value);
            }
            if (fieldValue.id !== undefined && fieldValue.id !== null && fieldValue.id !== '') {
                return String(fieldValue.id);
            }
        }
        return null;
    }

    onClick = (e) => {
        e?.stopPropagation?.();

        const dataManager = this.props?.DataManager ?? {};
        const graphMetaId = this.props?.graphMetaId ?? dataManager?.metaOwner;

        if (!graphMetaId) {
            console.error('GraphOpen: graphMetaId or DataManager.metaOwner not found');
            return;
        }

        let url = `/servisi/graph?id=${encodeURIComponent(graphMetaId)}`;

        const nodeIdField = this.props?.nodeIdField;
        if (nodeIdField) {
            const selectedRows = dataManager?.selectedRows ?? [];
            if (!selectedRows.length) {
                console.error('GraphOpen: select a row in the table');
                return;
            }

            const nodeId = this.resolveFieldId(selectedRows[0]?.[nodeIdField]);
            if (!nodeId) {
                console.error(`GraphOpen: field "${nodeIdField}" is empty in selected row`);
                return;
            }

            url += `&nodeId=${encodeURIComponent(nodeId)}`;
        }

        window.open(
            url,
            '_blank',
            'noopener,noreferrer',
        );
    };

    render() {
        return (
            <Button
                title="Граф"
                leftIcon={StructureIcon}
                onClick={this.onClick}
                color="success"
            ></Button>
        );
    }
}