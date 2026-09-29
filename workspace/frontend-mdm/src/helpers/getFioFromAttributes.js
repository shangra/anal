import { USER_ATTRIBUTE_FAMILY_ID, USER_ATTRIBUTE_PATRONYMIC_ID, USER_ATTRIBUTE_NAME_ID } from '../settings/constants';

export const getFioFromAttributes = (attributes,keyId = "attribute_id") => {
    const nameAttribute = attributes.find((attr) => attr[keyId] === USER_ATTRIBUTE_NAME_ID);
    const familyAttribute = attributes.find((attr) => attr[keyId] === USER_ATTRIBUTE_FAMILY_ID);
    const patronymicAttribute = attributes.find((attr) => attr[keyId] === USER_ATTRIBUTE_PATRONYMIC_ID);
    const shortFio = getFio(nameAttribute, familyAttribute, patronymicAttribute, true);
    return shortFio;
};

export const getFioFullFromUserState = (attributes) => {
    const nameAttribute = attributes?.[USER_ATTRIBUTE_NAME_ID];
    const familyAttribute = attributes?.[USER_ATTRIBUTE_FAMILY_ID];
    const patronymicAttribute = attributes?.[USER_ATTRIBUTE_PATRONYMIC_ID];
    const fio = getFio(nameAttribute, familyAttribute, patronymicAttribute);
    return fio;
};

export const getFioShortFromUserState = (attributes) => {
    const nameAttribute = attributes?.[USER_ATTRIBUTE_NAME_ID];
    const familyAttribute = attributes?.[USER_ATTRIBUTE_FAMILY_ID];
    const patronymicAttribute = attributes?.[USER_ATTRIBUTE_PATRONYMIC_ID];
    const shortFio = getFio(nameAttribute, familyAttribute, patronymicAttribute, true);
    return shortFio;
};

const getFio = (nameAttribute, familyAttribute, patronymicAttribute, isShortFio = false) => {
    if (!familyAttribute?.value) {
        return '';
    }
    let name = !nameAttribute?.value || nameAttribute?.value.length === 0 ? '' : nameAttribute.value;
    let patronymic =
        !patronymicAttribute?.value || patronymicAttribute?.value.length === 0 || !name ? '' : patronymicAttribute.value;

    if (isShortFio && name.length > 0) name = `${name.slice(0, 1).toUpperCase()}.`;
    if (isShortFio && patronymic.length > 0) patronymic = `${patronymic.slice(0, 1).toUpperCase()}.`;
    else patronymic = ` ${patronymic}`;

    const fio = `${familyAttribute.value} ${name}${patronymic}`.trim();
    return fio;
};
