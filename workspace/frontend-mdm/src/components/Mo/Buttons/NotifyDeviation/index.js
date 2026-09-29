import React, { Component } from 'react';
import { Button, NotificationsIcon } from 'ui-kit';
import $api from '../../../../helpers/axios';

function extractRefValue(fieldValue) {
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        return null;
    }
    if (typeof fieldValue === 'object') {
        return fieldValue.value ?? fieldValue.id ?? fieldValue.link ?? null;
    }
    return fieldValue;
}

const DEFAULT_PAYLOAD_FIELDS = ['period', 'value', 'descript', 'raspok', 'rejected'];
const DEFAULT_METRIC_FIELD = 'otkl';
const NOTIFY_ROW_ATTRIBUTES = ['id', 'period', 'value', 'descript', 'raspok', 'rejected', 'otkl'];

function normalizeRaspok(value) {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return null;
        }
        const parsed = JSON.parse(trimmed);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('raspok: ожидается JSON-объект');
        }
        return parsed;
    }
    throw new Error('raspok: невалидный тип');
}

function resolveMetricFieldName(metricIdField, nodeIdField) {
    const field = metricIdField ?? DEFAULT_METRIC_FIELD;
    if (field === nodeIdField) {
        return DEFAULT_METRIC_FIELD;
    }
    return field;
}

async function loadDeviationRow(metaOwner, deviationId) {
    if (metaOwner === undefined || metaOwner === null || metaOwner === '') {
        return { row: null, refs: null };
    }
    const metaRes = await $api.get(`/metadata/object/${metaOwner}`, { data: { flashOff: true } });
    const metadata = metaRes.data;
    if (metadata?.routes === undefined || metadata?.id === undefined) {
        return { row: null, refs: null };
    }
    const options = {
        where: { id: deviationId },
        withOutCount: true,
        attributes: NOTIFY_ROW_ATTRIBUTES,
    };
    const query = encodeURIComponent(JSON.stringify(options));
    const path = `/${metadata.routes.toLowerCase()}/${metadata.id}?options=${query}`;
    const res = await $api.get(path, { data: { flashOff: true } });
    const row = res.data?.rows?.[0] ?? null;
    const refs = res.data?.refs ?? null;
    return { row, refs };
}

function mergeRefsMaps(primaryRefs, extraRefs) {
    if (extraRefs === undefined || extraRefs === null) {
        return primaryRefs;
    }
    if (primaryRefs === undefined || primaryRefs === null) {
        return extraRefs;
    }
    const merged = { ...primaryRefs };
    for (const fieldName of Object.keys(extraRefs)) {
        const baseFieldRefs = merged[fieldName] ?? {};
        merged[fieldName] = { ...baseFieldRefs, ...extraRefs[fieldName] };
    }
    return merged;
}

function getRefsMap(dataManager) {
    const listRefs = dataManager?.meta?.list?.refs;
    if (listRefs !== undefined && listRefs !== null) {
        return listRefs;
    }
    const recordRefs = dataManager?.meta?.record?.refs;
    if (recordRefs !== undefined && recordRefs !== null) {
        return recordRefs;
    }
    const managerRefs = dataManager?.refs;
    if (managerRefs !== undefined && managerRefs !== null) {
        return managerRefs;
    }
    return null;
}

function resolveRefLabel(refsMap, fieldName, fieldValue) {
    if (refsMap === null) {
        return null;
    }
    const fieldRefs = refsMap[fieldName];
    if (fieldRefs === undefined || fieldRefs === null) {
        return null;
    }
    const label = fieldRefs[fieldValue];
    if (label === undefined || label === null || label === '') {
        return null;
    }
    return label;
}

function buildNotifyPayloadFromRow(row, metricIdField, payloadFields, refsMap) {
    const payload = {};
    for (const field of payloadFields) {
        if (field === 'raspok') {
            payload.raspok = normalizeRaspok(row?.raspok);
        } else {
            payload[field] = row?.[field] ?? null;
        }
    }
    if (row?.value !== undefined && row?.value !== null) {
        payload.deviationValue = row.value;
    }
    const metricId = extractRefValue(row?.[metricIdField]);
    if (metricId !== null) {
        payload.metricId = metricId;
        const metricName = resolveRefLabel(refsMap, metricIdField, metricId);
        if (metricName !== null) {
            payload.metricName = metricName;
        }
    }
    return payload;
}

export class NotifyDeviation extends Component {
    state = {
        buttonState: 'idle',
    };

    resetButtonStateTimer = null;

    setButtonState = (buttonState) => {
        if (this.resetButtonStateTimer !== null) {
            clearTimeout(this.resetButtonStateTimer);
            this.resetButtonStateTimer = null;
        }
        this.setState({ buttonState });
        if (buttonState === 'success' || buttonState === 'error') {
            this.resetButtonStateTimer = setTimeout(() => {
                this.setState({ buttonState: 'idle' });
            }, 3000);
        }
    };

    onClick = async (event) => {
        event?.stopPropagation?.();

        const dataManager = this.props?.DataManager ?? {};
        const nodeIdField = this.props?.nodeIdField ?? 'id';
        const metricIdField = this.props?.metricIdField ?? 'otkl';
        const payloadFields = this.props?.payloadFields ?? DEFAULT_PAYLOAD_FIELDS;
        const selectedRows = dataManager?.selectedRows ?? [];
        if (selectedRows.length === 0) {
            this.setButtonState('error');
            console.error('NotifyDeviation: выделите строку в таблице');
            return;
        }

        const row = selectedRows[0];
        const deviationId = row?.[nodeIdField];

        if (deviationId === undefined || deviationId === null || deviationId === '') {
            this.setButtonState('error');
            console.error(`NotifyDeviation: поле "${nodeIdField}" пустое в выбранной строке`);
            return;
        }

        this.setButtonState('loading');

        try {
            let notifyPayload;
            try {
                const metricField = resolveMetricFieldName(metricIdField, nodeIdField);
                let rowForPayload = row;
                let refsMap = getRefsMap(dataManager);

                if (extractRefValue(rowForPayload?.[metricField]) === null) {
                    const metaOwner = dataManager.metaOwner;
                    const loaded = await loadDeviationRow(metaOwner, deviationId);
                    if (loaded.row !== null) {
                        rowForPayload = { ...rowForPayload, ...loaded.row };
                    }
                    refsMap = mergeRefsMaps(refsMap, loaded.refs);
                }

                notifyPayload = buildNotifyPayloadFromRow(
                    rowForPayload,
                    metricField,
                    payloadFields,
                    refsMap,
                );
            } catch (parseError) {
                this.setButtonState('error');
                console.error('NotifyDeviation:', parseError?.message ?? parseError);
                return;
            }
            const { data } = await $api.post(`/metadata/deviation-alerts/${deviationId}/notify`, {
                payload: notifyPayload,
            });
            console.info('NotifyDeviation: уведомление отправлено', data);
            this.setButtonState('success');
        } catch (error) {
            console.error('NotifyDeviation:', error?.response?.data ?? error);
            this.setButtonState('error');
        }
    };

    getButtonTitle() {
        const titles = {
            idle: 'Отправить уведомление',
            loading: 'Отправка...',
            success: 'Уведомление отправлено',
            error: 'Ошибка отправки',
        };
        return titles[this.state.buttonState] ?? titles.idle;
    }

    getButtonColor() {
        if (this.state.buttonState === 'success') {
            return 'success';
        }
        return 'primary';
    }

    render() {
        const isLoading = this.state.buttonState === 'loading';
        const buttonState = this.state.buttonState;
        const statusText = buttonState === 'idle' ? '' : this.getButtonTitle();
        return (
            <Button
                title={this.getButtonTitle()}
                leftIcon={NotificationsIcon}
                onClick={this.onClick}
                color={this.getButtonColor()}
                disabled={isLoading}
            >
                {statusText}
            </Button>
        );
    }
}