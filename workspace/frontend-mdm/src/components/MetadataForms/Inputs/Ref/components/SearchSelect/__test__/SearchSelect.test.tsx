import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SearchSelect } from '../index';

// Мок для uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123'),
}));

// Мок для стилей
jest.mock('../SeachSelect.module.css', () => ({
    searchSelect: 'searchSelect',
    selectedItemPanel: 'selectedItemPanel',
    selectDropdownPart: 'selectDropdownPart',
    selectListView: 'selectListView',
    arrowDownButton: 'arrowDownButton',
    closeButton: 'closeButton',
    iconWrapper: 'iconWrapper',
    icon: 'icon',
    clearIcon: 'clearIcon',
}));

// Мок для CommonInput
jest.mock('../../../../../../CommonInput', () => ({
    CommonInput: (props: any) => {
        const {
            value,
            placeholder,
            selectButton,
            changeButton,
            deleteButton,
            openButton,
            onClickSelect,
            onClickDelete,
            onClickOpen,
            onKeyDown,
            onChange,
            onDoubleClick,
            readonly,
            ...restProps
        } = props;

        return (
            <div data-testid='common-input' {...restProps}>
                <input
                    data-testid='common-input-field'
                    defaultValue={value}
                    placeholder={placeholder}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    onDoubleClick={onDoubleClick}
                    readOnly={readonly}
                />
                {selectButton && (
                    <button
                        data-testid='select-button'
                        type='button'
                        onClick={onClickSelect}
                    >
                        Select
                    </button>
                )}
                {deleteButton && (
                    <button
                        data-testid='delete-button'
                        type='button'
                        onClick={onClickDelete}
                    >
                        Delete
                    </button>
                )}
                {changeButton && (
                    <button data-testid='change-button' type='button'>
                        Change
                    </button>
                )}
                {openButton && (
                    <button
                        data-testid='open-button'
                        type='button'
                        onClick={onClickOpen}
                    >
                        Open
                    </button>
                )}
            </div>
        );
    },
}));

// Мок для Popover
jest.mock('../../Popover', () => ({
    Popover: ({ opened, content, children }: any) => (
        <div data-testid='popover' data-opened={opened}>
            {children}
            {opened && <div data-testid='popover-content'>{content}</div>}
        </div>
    ),
}));

// Мок для List
jest.mock('../../List', () => ({
    List: ({ options, value, loading, onChange, testId }: any) => (
        <div data-testid={testId || 'list'} data-loading={loading}>
            {options?.length === 0 && !loading && (
                <div data-testid='empty-list'>Нет элементов</div>
            )}
            {options?.map(
                ({ value: val, label }: { value: string; label: string }) => (
                    <div
                        key={val}
                        data-testid={`list-item-${val}`}
                        data-selected={value?.includes(val)}
                        onClick={() => onChange?.(val, { value: val, label })}
                    >
                        {label}
                    </div>
                )
            )}
        </div>
    ),
}));

describe('SearchSelect', () => {
    const mockLoadMoreCallback = jest.fn();
    const mockOnSelectOption = jest.fn();
    const mockOnKeyDown = jest.fn();
    const mockOnClear = jest.fn();

    const defaultProps = {
        name: 'test-ref',
        value: { value: '123', label: 'Test Label' },
        placeholder: 'Поиск...',
        loadMoreCallback: mockLoadMoreCallback,
        onSelectOption: mockOnSelectOption,
        onKeyDown: mockOnKeyDown,
        onClear: mockOnClear,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить SearchSelect с заданными пропсами', () => {
        render(<SearchSelect {...defaultProps} />);

        expect(screen.getByTestId('common-input')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Label')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Поиск...')).toBeInTheDocument();
    });

    it('должен открыть/закрыть попап при клике на selectButton', async () => {
        const user = userEvent.setup();
        mockLoadMoreCallback.mockResolvedValue({ rows: [], count: 0 });

        render(<SearchSelect {...defaultProps} />);

        // по умолчанию закрыт
        expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();

        // открываем
        await user.click(screen.getByTestId('select-button'));
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();

        // закрываем
        await user.click(screen.getByTestId('select-button'));
        expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
    });

    it('должен вызвать onSelectOption с пустым значением при клике на deleteButton', async () => {
        const user = userEvent.setup();
        render(<SearchSelect {...defaultProps} />);

        await user.click(screen.getByTestId('delete-button'));

        expect(mockOnSelectOption).toHaveBeenCalledTimes(1);
        expect(mockOnSelectOption).toHaveBeenCalledWith({
            value: null,
            label: '',
        });
        expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it('должен загружать элементы при открытии попапа', async () => {
        const user = userEvent.setup();
        mockLoadMoreCallback.mockResolvedValue({
            rows: [
                { value: '1', label: 'Результат 1' },
                { value: '2', label: 'Результат 2' },
            ],
            count: 2,
        });

        render(<SearchSelect {...defaultProps} />);

        await user.click(screen.getByTestId('select-button'));

        await waitFor(() => {
            expect(mockLoadMoreCallback).toHaveBeenCalled();
        });

        expect(screen.getByTestId('list-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('list-item-2')).toBeInTheDocument();
    });

    it('должен выполнить onSelectOption при выборе элемента из списка', async () => {
        const user = userEvent.setup();
        mockLoadMoreCallback.mockResolvedValue({
            rows: [{ value: '42', label: 'Выбранный' }],
            count: 1,
        });

        render(<SearchSelect {...defaultProps} />);

        await user.click(screen.getByTestId('select-button'));

        await waitFor(() => {
            expect(screen.getByTestId('list-item-42')).toBeInTheDocument();
        });

        await user.click(screen.getByTestId('list-item-42'));

        expect(mockOnSelectOption).toHaveBeenCalledWith({
            value: '42',
            label: 'Выбранный',
        });
    });

    it('должен обновлять searchTextValue при вводе в поле', async () => {
        const user = userEvent.setup();
        mockLoadMoreCallback.mockResolvedValue({ rows: [], count: 0 });

        render(<SearchSelect {...defaultProps} />);

        const input = screen.getByTestId('common-input-field');
        await user.type(input, ' new');

        expect(input).toHaveValue('Test Label new');
    });

    it('должен вызвать onKeyDown при нажатии Enter', async () => {
        const user = userEvent.setup();
        render(<SearchSelect {...defaultProps} />);

        const input = screen.getByTestId('common-input-field');
        await user.type(input, '{Enter}');

        expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
    });

    it('должен загрузить элементы при вводе в поле', async () => {
        const user = userEvent.setup();
        mockLoadMoreCallback.mockResolvedValue({ rows: [], count: 0 });

        render(<SearchSelect {...defaultProps} />);

        const input = screen.getByTestId('common-input-field');
        await user.clear(input);
        await user.type(input, 'тест');

        await waitFor(() => {
            // при смене searchTextValue вызывается loadMoreCallback
            expect(mockLoadMoreCallback).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 15, offset: 0 }),
                'тест',
                true
            );
        });
    });

    it('должен отрендерить иерархический список при hierarchy=true', async () => {
        mockLoadMoreCallback.mockResolvedValue({ rows: [], count: 0 });

        render(<SearchSelect {...defaultProps} hierarchy />);

        // иерархический список рендерится без List
        expect(
            screen.queryByTestId('search-select-list')
        ).not.toBeInTheDocument();

        // Компонент не падает с hierarchy=true
        expect(screen.getByTestId('common-input')).toBeInTheDocument();
    });

    it('должен отрендерить кнопки change и open при соответствующих пропсах', () => {
        render(
            <SearchSelect
                {...defaultProps}
                changeButton
                openButton
                onClickOpen={jest.fn()}
            />
        );

        expect(screen.getByTestId('change-button')).toBeInTheDocument();
        expect(screen.getByTestId('open-button')).toBeInTheDocument();
    });
});
