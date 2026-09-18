import { Component } from 'react';
import {
    Stack as StackComponent,
    StackProps as StackComponentProps,
    STACK_JUSTIFY_CONTENT,
    STACK_ALIGN_ITEM,
    STACK_DIRECTION,
    STACK_WRAP,
} from 'ui-kit';
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


export class Stack extends Component<StackComponentProps> {
    static constructorSettings = {
        slots: ["children"],
        name: 'Stack',
        description: 'Набор элементов',
        propsData: {
            justifyContent: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'justifyContent',
                propVariants: [
                    {label: 'center', value: STACK_JUSTIFY_CONTENT.CENTER},
                    {label: 'end', value: STACK_JUSTIFY_CONTENT.END},
                    {label: 'left', value: STACK_JUSTIFY_CONTENT.LEFT},
                    {label: 'revert', value: STACK_JUSTIFY_CONTENT.REVERT},
                    {label: 'right', value: STACK_JUSTIFY_CONTENT.RIGHT},
                    {label: 'space-around', value: STACK_JUSTIFY_CONTENT.SPACE_AROUND},
                    {label: 'space-between', value: STACK_JUSTIFY_CONTENT.SPACE_BETWEEN},
                    {label: 'space-evenly', value: STACK_JUSTIFY_CONTENT.SPACE_EVENLY},
                    {label: 'start', value: STACK_JUSTIFY_CONTENT.START},
                    {label: 'stretch', value: STACK_JUSTIFY_CONTENT.STRETCH},
                ] 
            }, 
            alignItems: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'alignItems',
                propVariants: [
                    {label: 'center', value: STACK_ALIGN_ITEM.CENTER},
                    {label: 'end', value: STACK_ALIGN_ITEM.END},
                    {label: 'flex-end', value: STACK_ALIGN_ITEM.FLEX_END},
                    {label: 'flex-start', value: STACK_ALIGN_ITEM.FLEX_START},
                    {label: 'start', value: STACK_ALIGN_ITEM.START},
                    {label: 'stretch', value: STACK_ALIGN_ITEM.STRETCH},
                ] 
            }, 
            direction: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'direction',
                propVariants: [
                    {label: 'column', value: STACK_DIRECTION.COLUMN},
                    {label: 'column_reverse', value: STACK_DIRECTION.COLUMN_REVERSE},
                    {label: 'row', value: STACK_DIRECTION.ROW},
                    {label: 'row-reverse', value: STACK_DIRECTION.ROW_REVERSE},
                ] 
            }, 
            wrap: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'wrap',
                propVariants: [
                    {label: 'wrap', value: STACK_WRAP.WRAP},
                    {label: 'wrap-reverse', value: STACK_WRAP.WRAP_REVERSE},
                ] 
            }, 
            fullWidth: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'fullWidth',
            }, 
            fullHeight: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'fullHeight',
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            },
            gap: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gap',
            }, 
            columnGap: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'columnGap',
            }, 
            rowGap: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'rowGap',
            },
            onClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по клику',
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
                propTitle: 'Функция при уводе курсора',
            },
        },
    };

    render = () => (
        <StackComponent {...this.props} />
    )
}

export type StackProps = StackComponentProps