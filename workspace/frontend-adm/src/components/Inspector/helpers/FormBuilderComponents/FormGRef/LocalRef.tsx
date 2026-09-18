import { FormGroupList } from 'components/Inspector/helpers/FormBuilderComponents/FormGroupList';
import {
    FormGRefData,
    FormGRefMetadataLink,
    FormGRefProps,
    FormGRefValue,
} from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/types';

export type LocalRefProps = {
    data: FormGRefData;
    value: FormGRefValue | string;
    disabled?: boolean;
    onChange?: FormGRefProps['onChange'];
    options?: Record<string | number, string | Record<string, string>>;
    dataInfo: Record<string, Record<string, FormGRefMetadataLink>>;
    loading: boolean;
    titleLabels?: Record<string, string>;
};

/**
 * Локальные ссылки (data.link не типа 'global') — рендерятся в FormGroupList.
 * Список опций, loading и dataInfo приходят из общей логики FormGRef (index.tsx).
 */
export function LocalRef(props: LocalRefProps) {
    const { data, value, disabled, onChange, options, dataInfo, loading, titleLabels } = props;

    const handleChange = (name: string, jsonValue: string) => {
        const refValue: FormGRefValue | string = JSON.parse(jsonValue ?? '{}');
        const newValue = JSON.parse(jsonValue ?? '{}');
        onChange?.(data.name, refValue, {
            [data.name]: dataInfo[data.name][typeof newValue === 'object' ? newValue?.value : newValue],
        });
    };

    // В исходном FormGRef disabled передавался в FormGroupList только при строковой ссылке (data.link: string),
    // для локальной ссылки-объекта пропс не прокидывался — сохраняем прежнее поведение
    const isPlainLink = typeof data.link === 'string';

    return (
        <FormGroupList
            value={value}
            // @ts-ignore — FormGroupList принимает свою собственную сигнатуру onChange
            onChange={handleChange}
            data={{ ...data, list: options }}
            loading={loading}
            disabled={isPlainLink ? disabled : undefined}
            titleLabels={titleLabels}
        />
    );
}
