// import { USER_ATTRIBUTE_FAMILY_ID, USER_ATTRIBUTE_PATRONYMIC_ID, USER_ATTRIBUTE_NAME_ID } from './constants';
const USER_ATTRIBUTE_FAMILY_ID = '156a7669-c2d9-447e-8956-75710f0dc3c7';
const USER_ATTRIBUTE_NAME_ID = '074bd055-409b-4ad3-b73f-04620511c46f';
const USER_ATTRIBUTE_PATRONYMIC_ID = '18e71a0f-d76a-4c8e-b7f1-c49cff474536';
const USER_ATTRIBUTE_POSITION = 'f86a1388-df74-492d-bfe2-89056249a893';

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

export const attributesArrayToObject = (attributes) => {
    const attributesObject = {};
    attributes.forEach((element) => {
        attributesObject[element.attribute_id] = element;
    });
    return attributesObject;
};

export const getFioFromAttributes = (attributes, keyId = 'attribute_id') => {
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

export const getUserPosition = (attributes) => attributes?.[USER_ATTRIBUTE_POSITION];
