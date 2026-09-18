import { FC } from 'react';

import { BaseChartForm } from '../BaseChartForm';
import { INITIAL_FORM_DATA } from './constants';
import { CreateChartFormProps } from './types';

/**
 * Форма создания нового графика.
 * Вся логика находится в BaseChartForm.
 */
export const CreateChartForm: FC<CreateChartFormProps> = ({ spreadSheetId, onSubmit }) => (
    <BaseChartForm
        spreadSheetId={spreadSheetId}
        initialData={INITIAL_FORM_DATA}
        submitLabel="Создать"
        onSubmit={onSubmit}
        showResetButton
    />
);
