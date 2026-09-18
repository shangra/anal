import $api from 'helpers/axios';
import $message from 'components/ui/MyFlash/message.helper';
import $confirm from 'ui/MyConfirm/confirm';
import { rlsDropConfirmText } from 'helpers/rlsConfirm.helper';
import { RawChildNode } from 'components/MetadataHier/types';
import { FormSchema } from 'components/MetadataHier/actions/types';
import type { FormValues } from 'components/Inspector/types';
import { buildUrl } from 'helpers/buildUrl';

export type FormData = Pick<FormSchema, 'type' | 'data' | 'manifest'>;

export interface CreateSaveHandlerParams {
    form: FormData;
    node: RawChildNode;
    server?: string;
    onSuccess?: () => void | Promise<void>;
}
export type SaveHandler = (values: FormValues, setNewValues: (newValues: FormValues) => void) => Promise<void>;

export async function fetchCreateForm(server: string, routes: string): Promise<FormSchema> {
    const url = buildUrl(server, routes, 'metadata');
    const { data } = await $api.get<FormSchema>(`/${url}`);
    return data;
}
export const createSaveHandler =
    ({ form, node, server = '', onSuccess }: CreateSaveHandlerParams): SaveHandler =>
    async (values, setNewValues) => {
        if (values.type !== undefined && (!values.type || values.type === '')) {
            $message.show('Пожалуйста, выберите тип поля');
            setNewValues(values);
            return;
        }
        const resultForm = JSON.parse(JSON.stringify(values));
        if (resultForm['manifest.name'] === '' || resultForm['manifest.description'] === '') {
            $message.show('Пожалуйста, заполните наименование и описание');
            setNewValues(values);
            return;
        }

        const json = {
            owner_id: node.owner_id === '00000000-0000-0000-0000-000000000000' ? node.class_id : node.owner_id,
            class_id: node.class_id,
            class: node.class,
            name: resultForm['manifest.name'],
            description: resultForm['manifest.description'],
            settings: {} as Record<string, string>,
            events: {} as Record<string, string>,
        };

        delete resultForm['manifest.name'];
        delete resultForm['manifest.description'];
        json.settings = resultForm;

        // Снятие галки RLS перехватываем до сохранения: бэкенд без confirmRlsDrop
        // сохранит флаг, но RLS-объекты не тронет
        const rawRls = resultForm.rls as unknown;
        const rlsNowOn = !(rawRls === false || rawRls === 'false' || rawRls === 0 || rawRls === '0');
        if (form.type === 'update' && form.data?.rls && !rlsNowOn && form.data?.table) {
            const confirmed = await new Promise<boolean>((resolve) => {
                $confirm(rlsDropConfirmText(String(form.data.table)), resolve);
            });
            if (!confirmed) {
                setNewValues(values);
                return;
            }
            (json as Record<string, unknown>).confirmRlsDrop = true;
        }

        const route = node.routes.replace(/^\/+/gi, '');
        const url = buildUrl(server, route, 'metadata');
        const apiCall = form.type === 'update' ? $api.put(`/${url}/${node.id}`, json) : $api.post(`/${url}`, json);

        try {
            await apiCall;

            const formData = form?.data ?? {};
            const newValues = {
                'manifest.name': form?.manifest.name ?? '',
                'manifest.description': form?.manifest.description ?? '',
                ...formData,
            };

            setNewValues(newValues);
            await onSuccess?.();

            $message.show('Значение сохранено!');
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            $message.show('Ошибка при сохранении!');
            // Разблокируем кнопку — позволяет юзеру поправить форму и retry
            setNewValues(values);
        }
    };
