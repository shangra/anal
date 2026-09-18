import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Composite } from 'components/MetadataForms/Inputs/Composite';
import $modal from 'components/ui/MyModal/modal.helper';

// Мок для стилей
jest.mock('../../style.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
    resetCommonInputWrapper: 'resetCommonInputWrapper',
    resetCommonInput: 'resetCommonInput',
}));

// Мок для ui-kit
jest.mock('ui-kit', () => ({
    List: (props: any) => {
        const { options, onChange, value } = props;
        return (
            <div data-testid="mock-list">
                {options?.map((opt: any) => (
                    <button
                        key={opt.value}
                        data-testid={`list-option-${opt.value}`}
                        onClick={() => onChange?.([opt.value], opt)}
                    >
                        {opt.label}
                    </button>
                ))}
                <div data-testid="list-selected-value">{value?.join(', ') || ''}</div>
            </div>
        );
    },
}));

// Мок для $modal
jest.mock('components/ui/MyModal/modal.helper', () => ({
    show: jest.fn(),
    hide: jest.fn(),
}));

// Моки для дочерних инпутов
jest.mock('../../String', () => ({
    String: (props: any) => (
        <input
            data-testid="mock-string-input"
            value={props.value ?? ''}
            placeholder={props.placeholder}
            onChange={(e) => props.onChange?.(e.target.value)}
            onDoubleClick={props.onDoubleClick}
            readOnly={props.readOnly}
        />
    ),
}));

jest.mock('../../Integer', () => ({
    Integer: (props: any) => (
        <input
            data-testid="mock-integer-input"
            type="number"
            value={props.value ?? ''}
            placeholder={props.placeholder}
            onChange={(e) => props.onChange?.(Number(e.target.value))}
            onDoubleClick={props.onDoubleClick}
            readOnly={props.readOnly}
        />
    ),
}));

jest.mock('../../Float', () => ({
    Float: (props: any) => (
        <input
            data-testid="mock-float-input"
            type="number"
            step="any"
            value={props.value ?? ''}
            placeholder={props.placeholder}
            onChange={(e) => props.onChange?.(Number(e.target.value))}
            onDoubleClick={props.onDoubleClick}
            readOnly={props.readOnly}
        />
    ),
}));

jest.mock('../../BooleanInput', () => ({
    BooleanInput: (props: any) => (
        <input
            data-testid="mock-boolean-input"
            value={props.value ?? ''}
            placeholder={props.placeholder}
            onChange={(e) => props.onChange?.(e.target.value === 'true')}
            onDoubleClick={props.onDoubleClick}
            readOnly={props.readOnly}
        />
    ),
}));

jest.mock('../../DateTime', () => ({
    DateTime: (props: any) => (
        <input
            data-testid="mock-datetime-input"
            value={props.value ?? ''}
            placeholder={props.placeholder}
            onChange={(e) => props.onChange?.(e.target.value)}
            onDoubleClick={props.onDoubleClick}
            readOnly={props.readOnly}
        />
    ),
}));

jest.mock('../../Ref', () => ({
    Ref: (props: any) => (
        <div data-testid="mock-ref-input">
            <input data-testid="mock-ref-value" value={props?.value?.label ?? ''} placeholder="Ссылка" readOnly />
        </div>
    ),
}));

// Мок для CommonInput — упрощённый рендер с передачей колбэков
jest.mock('../../../../CommonInput', () => {
    const CommonInputContext = require('react').createContext({ deleteButton: false });
    return {
        CommonInput: (props: any) => (
            <div data-testid="mock-common-input" className={props.className}>
                {props.changeButton && (
                    <button data-testid="change-type-button" onClick={props.onClickChange}>
                        Сменить тип
                    </button>
                )}
                {props.deleteButton && (
                    <button data-testid="delete-button" onClick={props.onClear}>
                        Удалить
                    </button>
                )}
                {props.children}
            </div>
        ),
        CommonInputContext,
    };
});

const defaultDataTypes = [
    { label: 'Строка', value: 'string', typeName: 'string' },
    { label: 'Число', value: 'integer', typeName: 'integer' },
    { label: 'Логический', value: 'boolean', typeName: 'boolean' },
    { label: 'Дата', value: 'datetime', typeName: 'datetime' },
    { label: 'Дробное', value: 'float', typeName: 'float' },
    { label: 'Ссылка', value: 'ref', typeName: 'ref', link: 'test-ref' },
];

const defaultValue: any = {
    type: 'string',
    value: 'test',
    link: null,
    label: null,
};

describe('Composite', () => {
    const mockOnChange = jest.fn();
    const mockOnClear = jest.fn();

    const defaultProps = {
        label: 'Композитное поле',
        value: defaultValue,
        dataTypes: defaultDataTypes,
        onChange: mockOnChange,
        onClear: mockOnClear,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с defaultProps (тип string)', () => {
        render(<Composite {...defaultProps} />);

        expect(screen.getByTestId('mock-string-input')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test')).toBeInTheDocument();
        expect(screen.getByTestId('mock-common-input')).toBeInTheDocument();
        expect(screen.getByTestId('change-type-button')).toBeInTheDocument();
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    it('должен отрендерить инпут Integer при type=integer', () => {
        render(<Composite {...defaultProps} value={{ type: 'integer', value: 42, link: null, label: null }} />);

        expect(screen.getByTestId('mock-integer-input')).toBeInTheDocument();
        expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    });

    it('должен отрендерить Float при type=float', () => {
        render(<Composite {...defaultProps} value={{ type: 'float', value: 3.14, link: null, label: null }} />);

        expect(screen.getByTestId('mock-float-input')).toBeInTheDocument();
        expect(screen.getByDisplayValue('3.14')).toBeInTheDocument();
    });

    it('должен отрендерить BooleanInput при type=boolean', () => {
        render(<Composite {...defaultProps} value={{ type: 'boolean', value: true, link: null, label: null }} />);

        expect(screen.getByTestId('mock-boolean-input')).toBeInTheDocument();
    });

    it('должен отрендерить DateTime при type=datetime', () => {
        render(
            <Composite
                {...defaultProps}
                value={{ type: 'datetime', value: '2024-01-15T10:30:00', link: null, label: null }}
            />,
        );

        expect(screen.getByTestId('mock-datetime-input')).toBeInTheDocument();
    });

    it('должен вызвать onClear при клике на кнопку удаления', async () => {
        const user = userEvent.setup();
        render(<Composite {...defaultProps} />);

        const deleteButton = screen.getByTestId('delete-button');
        await user.click(deleteButton);

        await waitFor(() => {
            expect(mockOnClear).toHaveBeenCalledTimes(1);
        });
    });

    it('должен открыть модальное окно выбора типа при клике на кнопку смены типа', async () => {
        const user = userEvent.setup();
        render(<Composite {...defaultProps} />);

        const changeTypeButton = screen.getByTestId('change-type-button');
        await user.click(changeTypeButton);

        expect($modal.show).toHaveBeenCalledWith('Выбор типа данных', expect.anything());
    });

    it('должен отображать корреткный placeholder для типа string', () => {
        render(<Composite {...defaultProps} />);

        const stringInput = screen.getByTestId('mock-string-input');
        expect(stringInput).toHaveAttribute('placeholder', 'Введите текст');
    });

    it('должен вызвать onDoubleClick при двойном клике', async () => {
        const user = userEvent.setup();
        const onDoubleClick = jest.fn();
        render(<Composite {...defaultProps} onDoubleClick={onDoubleClick} />);

        const stringInput = screen.getByTestId('mock-string-input');
        await user.dblClick(stringInput);

        expect(onDoubleClick).toHaveBeenCalledTimes(1);
    });
});
