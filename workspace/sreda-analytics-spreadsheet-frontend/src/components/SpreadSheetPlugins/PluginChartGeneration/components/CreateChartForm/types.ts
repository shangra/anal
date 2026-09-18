import { ChartTypes } from '../../../../ChartGenerationCMP/src';
import { AreaChartGeneration } from '../../../../ChartGenerationCMP/src/components/Area/types';
import { BarChartGeneration } from '../../../../ChartGenerationCMP/src/components/Bar/types';
import { LineChartGeneration } from '../../../../ChartGenerationCMP/src/components/Line/types';
import { PieChartGeneration } from '../../../../ChartGenerationCMP/src/components/Pie/types';
import { ScatterChartGeneration } from '../../../../ChartGenerationCMP/src/components/Scatter/types';

export type CreateChartFormState =
    | { type: Extract<ChartTypes, 'area'>; meta: AreaChartGeneration['meta'] }
    | { type: Extract<ChartTypes, 'line'>; meta: LineChartGeneration['meta'] }
    | { type: Extract<ChartTypes, 'bar'>; meta: BarChartGeneration['meta'] }
    | { type: Extract<ChartTypes, 'pie'>; meta: PieChartGeneration['meta'] }
    | { type: Extract<ChartTypes, 'scatter'>; meta: ScatterChartGeneration['meta'] };

export type CreateChartFormProps = {
    spreadSheetId: string;
    onSubmit: (formData: any) => void;
};
