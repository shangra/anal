import $api from '../../../helpers/axios';

interface ICubeSchema {
    id: string;
    onoff: boolean;
    type: string;
    value: string;
    name: string;
    label: string;
}

export class ApiForCubeStringBulder {
    static getFieldsById = async (id: string) => {
        if (id) {
            const fieldsData = await $api.get(`/metadata-cube-schema/${id}`);
            const fields = fieldsData.data || [];
            
            return { registryFields: fields.filter((item: ICubeSchema) => item.type), registryTableFields: [] };
        }
    }; 
}
