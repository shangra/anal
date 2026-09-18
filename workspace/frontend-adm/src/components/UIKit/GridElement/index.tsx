import { Component } from 'react';
import {
    GridElement as GridElementComponent,
    GridElementProps as GridElementComponentProps,
    GRID_ELEMENT_JUSTIFY_SELF,
    GRID_ELEMENT_ALIGN_SELF
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

export class GridElement extends Component<GridElementComponentProps> {
    static constructorSettings = {
        slot: ["children"],
        name: 'GridElement',
        description: 'Элемент сетки',
        propsData: {
            justifySelf: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'justifySelf',
                propVariants: [
                    {label: 'center', value: GRID_ELEMENT_JUSTIFY_SELF.CENTER},
                    {label: 'end', value: GRID_ELEMENT_JUSTIFY_SELF.END},
                    {label: 'start', value: GRID_ELEMENT_JUSTIFY_SELF.START},
                    {label: 'stretch', value: GRID_ELEMENT_JUSTIFY_SELF.STRETCH},
                ]
            }, 
            alignSelf: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'alignSelf',
                propVariants: [
                    {label: 'center', value: GRID_ELEMENT_ALIGN_SELF.CENTER},
                    {label: 'end', value: GRID_ELEMENT_ALIGN_SELF.END},
                    {label: 'start', value: GRID_ELEMENT_ALIGN_SELF.START},
                    {label: 'stretch', value: GRID_ELEMENT_ALIGN_SELF.STRETCH},
                ]
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.TEXTAREA,
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            }, 
            gridColumnStart: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gridColumnStart',
            },
            gridColumnEnd: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gridColumnEnd',
            },
            gridRowStart: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gridRowStart',
            },
            gridRowEnd: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gridRowEnd',
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
        <GridElementComponent {...this.props} />
    )
}

export type GridElementProps = GridElementComponentProps