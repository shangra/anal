import $api from 'helpers/axios';
import { FormSchema } from 'components/MetadataHier/actions/types';
import { buildUrl } from 'helpers/buildUrl';

export async function fetchCreateForm(server: string, routes: string, id: string): Promise<FormSchema> {
    const path = buildUrl(server, routes, 'metadata', id);
    const { data } = await $api.get(`/${path}`);
    return data;
}
