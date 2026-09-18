import { Component } from 'react';
import {
    Grid as GridComponent,
    GridProps as GridComponentProps,
    GRID_ALIGN_CONTENT,
    GRID_ALIGN_ITEMS,
    GRID_AUTO_FLOW,
    GRID_JUSTIFY_CONTENT,
    GRID_JUSTIFY_ITEMS
} from "ui-kit";
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

export class Grid extends Component<GridComponentProps> {
    static constructorSettings = {
        slot: ["children"],
        name: 'Grid',
        description: 'Сетка',
        propsData: { 
            gridAutoFlow: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'gridAutoFlow',
                propVariants: [
                    {label: 'column', value: GRID_AUTO_FLOW.COLUMN},
                    {label: 'row', value: GRID_AUTO_FLOW.ROW},
                ]
            }, 
            justifyItems: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'justifyItems',
                propVariants: [
                    {label: 'end', value: GRID_JUSTIFY_ITEMS.END},
                    {label: 'center', value: GRID_JUSTIFY_ITEMS.CENTER},
                    {label: 'start', value: GRID_JUSTIFY_ITEMS.START},
                    {label: 'stretch', value: GRID_JUSTIFY_ITEMS.STRETCH},
                ]
            }, 
            justifyContent: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'justifyContent',
                propVariants: [
                    {label: 'center', value: GRID_JUSTIFY_CONTENT.CENTER},
                    {label: 'end', value: GRID_JUSTIFY_CONTENT.END},
                    {label: 'around', value: GRID_JUSTIFY_CONTENT.SPACE_AROUND},
                    {label: 'between', value: GRID_JUSTIFY_CONTENT.SPACE_BETWEEN},
                    {label: 'start', value: GRID_JUSTIFY_CONTENT.START},
                    {label: 'stretch', value: GRID_JUSTIFY_CONTENT.STRETCH},
                ]
            },
            alignItems: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'justifyItems',
                propVariants: [
                    {label: 'center', value: GRID_JUSTIFY_ITEMS.CENTER},
                    {label: 'end', value: GRID_JUSTIFY_ITEMS.END},
                    {label: 'start', value: GRID_JUSTIFY_ITEMS.START},
                    {label: 'stretch', value: GRID_JUSTIFY_ITEMS.STRETCH},
                ]
            }, 
            alignContent: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'justifyContent',
                propVariants: [
                    {label: 'column', value: GRID_JUSTIFY_CONTENT.CENTER},
                    {label: 'row', value: GRID_JUSTIFY_CONTENT.END},
                    {label: '', value: GRID_JUSTIFY_CONTENT.SPACE_AROUND},
                    {label: 'row', value: GRID_JUSTIFY_CONTENT.SPACE_BETWEEN},
                    {label: 'row', value: GRID_JUSTIFY_CONTENT.SPACE_EVENLY},
                    {label: 'row', value: GRID_JUSTIFY_CONTENT.START},
                    {label: 'row', value: GRID_JUSTIFY_CONTENT.STRETCH},
                ]
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
            gridTemplateColumns: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gridTemplateColumns',
            },
            gridTemplateRows: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gagridTemplateRows',
            },
            columnGap: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'columnGap',
            },
            rowGap: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'rowGap',
            },
            gap: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'gap',
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
        <GridComponent {...this.props} />
    )
}

export type GridProps = GridComponentProps