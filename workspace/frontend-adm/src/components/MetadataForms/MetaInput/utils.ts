import { type IFieldUI } from '.';
import { fieldTypeName } from 'components/MetadataForms/MetaInput/constant';

export const getPlaceholder = (fieldUI: IFieldUI): string | undefined => {
    const type = fieldUI?.type;

    let placeholder = fieldUI?.placeholder;
    switch (type) {
        case fieldTypeName.GREF:
        case fieldTypeName.UUID:
        case fieldTypeName.REF: {
            placeholder = 'Ссылка';
            break;
        }
        case fieldTypeName.STRING:
        case fieldTypeName.TEXT: {
            placeholder = 'Введите текст';
            break;
        }
        case fieldTypeName.DATETIME:
        case fieldTypeName.DATE:
        case fieldTypeName.TIMESTAMP: {
            placeholder = 'Введите дату';
            break;
        }
        case fieldTypeName.FLOAT:
        case fieldTypeName.INTEGER: {
            placeholder = 'Введите число';
            break;
        }
        case fieldTypeName.COMPOSITE: {
            placeholder = 'Выберите тип значения';
            break;
        }
    }

    return placeholder;
};

export const getType = (fieldUI: IFieldUI, defenitionType: string) => {
    const typeName = fieldUI?.type;

    const type = fieldUI?.type;
    let inputType = type;

    if (defenitionType) {
        inputType = defenitionType.toLocaleLowerCase();
    } else {
        switch (type) {
            case fieldTypeName.GREF:
            case fieldTypeName.REF: {
                inputType = fieldTypeName.REF;
                break;
            }
            case fieldTypeName.UUID: {
                if (fieldUI?.ref) {
                    inputType = fieldTypeName.REF;
                } else {
                    inputType = fieldTypeName.STRING;
                }
                break;
            }
            case fieldTypeName.DATETIME:
            case fieldTypeName.TIMESTAMP: {
                inputType = fieldTypeName.DATETIME;
                break;
            }
            case fieldTypeName.DATE: {
                inputType = fieldTypeName.DATE;
                break;
            }

            case fieldTypeName.TEXT: {
                inputType = fieldTypeName.TEXT;
                break;
            }

            case fieldTypeName.VARCHAR:
            case fieldTypeName.STRING: {
                if (defenitionType && defenitionType.toLocaleLowerCase() === fieldTypeName.PERIOD) {
                    inputType = fieldTypeName.PERIOD;
                } else {
                    inputType = fieldTypeName.STRING;
                }

                break;
            }
            case fieldTypeName.BOOLEAN: {
                inputType = fieldTypeName.BOOLEAN;
                break;
            }
            case fieldTypeName.INTEGER: {
                inputType = fieldTypeName.INTEGER;
                break;
            }
            case fieldTypeName.FLOAT: {
                inputType = fieldTypeName.FLOAT;
                break;
            }
            default:
                inputType = type;
                break;
        }
    }

    return inputType ?? typeName;
};
