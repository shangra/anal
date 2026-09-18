import { Component } from 'react';
import { Select as SelectComponent, SelectProps as SelectComponentProps, SELECT_STATUS, SELECT_VARIANT, SelectOption as SelectOptionComponent} from 'ui-kit'
// import { FIELD_VARIANTS } from '../../FormConstructorAdapter/constants';
const FIELD_VARIANTS = {
    INPUT: 'input',
    TEXTAREA: 'textarea',
    NUMBER: 'number',
    CHECKBOX: 'checkbox',
    SELECT: 'select',
    PASSWORD: 'password',
    STYLE: 'style',
    FUNCTION: 'functions',
};

export class Select<T> extends Component<SelectComponentProps<T>> {
    static constructorSettings = {
        name: 'Выпадающий список',
        description: 'Выпадающий список',
        propsData: {
            placeholder: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Placeholder',
            },
            hint: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Подсказка',
            },
            // value: { // null || number[]

            // },
            // options: { // Array<{Item}> --> Item={label: "Black", value: 9}

            // },
            onChange: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция на изменение выбора',
            },
            resettable: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: '',
            },
            rounded: { 
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Скругление',
            },
            variant: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Вариант',
                propVariants: [
                    {label: 'outlined', value: SELECT_VARIANT.OUTLINED},
                    {label: 'contained', value: SELECT_VARIANT.CONTAINED},
                ],
            },
            status: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Статус',
                propVariants: [
                    {label: 'success', value: SELECT_STATUS.SUCCESS},
                    {label: 'error', value: SELECT_STATUS.ERROR},
                ],
            },
            fullWidth: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Во всю ширину',
            },
            disabled: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Неактивная',
            },
            onClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по клику',
            },
            onBlur: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при потери фокуса',
            },
            onFocus: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при фокусе',
            },
            onDoubleClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по двойному клику',
            },
            onMouseDown: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по нажатию мыши',
            },
            onMouseUp: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по отпусканию мыши',
            },
            onMouseEnter: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при наведении курсора',
            },
            onMouseLeave: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при уводу курсора',
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
            }
        },
    };
    render = () => (
        <SelectComponent {...this.props} />
    )
}

export type SelectProps<T> = SelectComponentProps<T>;
export type SelectOption<T> = SelectOptionComponent<T>;