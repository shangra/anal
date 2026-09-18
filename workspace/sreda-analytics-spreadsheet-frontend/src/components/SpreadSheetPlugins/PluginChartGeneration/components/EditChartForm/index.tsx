import { FC } from 'react';

import { BaseChartForm } from '../BaseChartForm';
import { EditChartFormProps } from './types';

/**
 * Форма редактирования существующего графика.
 * Отличается от CreateChartForm начальными данными и кнопкой «Назад».
 */
export const EditChartForm: FC<EditChartFormProps> = ({ meta, spreadSheetId, onSubmit, onClose }) => (
    <BaseChartForm
        spreadSheetId={spreadSheetId}
        initialData={meta}
        submitLabel="Сохранить"
        onSubmit={onSubmit}
        onClose={onClose}
        showResetButton
    />
);
