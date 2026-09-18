import StateManager from 'lite-react-statemanager';
import { PureComponent } from 'react';
import { Button, CloseIcon, IconButton, Popover, TextArea, Typography } from 'ui-kit';
import { v4 as uuidv4 } from 'uuid';

import { FilterDate } from '../../FilterDate';
import { FilterNumber } from '../../FilterNumber';
import FilterRef from '../../FilterRef';
import type { INode } from '../../FilterRef/types';
import { FilterString } from '../../FilterString';
import { FILTER_TYPES_ALL, FILTER_TYPES_DATE, FILTER_TYPES_NUMBER } from './constants';
import { getPastePlaceholder, getValidOperatorsForType, includes, parseDateString, parseFilterString } from './functions';
import style from './style.module.css';
import { IOnSelectFilterParam, TFilterBy, TFilterRangeItem, TFilterRefItem, TFilterType, TFilterValueItem } from './types';

export interface IPivotParamsFilter {
    id: string;
    filterBy: TFilterBy;
    comparison: 'or' | 'and';
    label: string;
    level?: number | null;
    value: string | number;
    from: string | number;
    to: string | number;
    cached?: INode[];
}

interface IFilterModalProps {
    title: string;
    type: TFilterType;
    name: string;
    metaref: { value: string };
    filterDefault: IPivotParamsFilter[];
    filterSetter: (filters: IPivotParamsFilter[] | { filters: IPivotParamsFilter[]; filterCached: INode[] }) => void;
    server?: string;
    filterCached: INode[];
    children?: React.ReactNode;
}

interface IFilterModalState {
    open: boolean;
    trigger: { x: number; y: number; width: number; height: number } | null;
    filters: IPivotParamsFilter[];
    filterCached: INode[];
    showPasteArea: boolean;
    pasteText: string;
    unparsedText: string[];
}

export class FilterModal extends PureComponent<IFilterModalProps, IFilterModalState> {
    private readonly refContainerId = uuidv4();

    private hasChanges = false;

    constructor(props: IFilterModalProps) {
        super(props);

        this.state = {
            open: false,
            trigger: null,
            filters: structuredClone(props.filterDefault ?? []),
            filterCached: structuredClone(props.filterCached ?? []),
            showPasteArea: false,
            pasteText: '',
            unparsedText: [],
        };
    }

    componentDidMount() {
        StateManager.subscribeState({
            [`FilterModal_${this.props.name}`]: {
                [`onSubShowFilterModal`]: (v: any) => {
                    const { open = false, x, y, width, height } = v[`FilterModal_${this.props.name}`] ?? {};
                    this.setState({
                        open,
                        // eslint-disable-next-line eqeqeq
                        trigger: x != undefined && y != undefined ? { x, y, width, height } : null,
                    });
                },
            },
        });
    }

    componentDidUpdate(prevProps: IFilterModalProps, prevState: IFilterModalState) {
        if (this.state.open && !prevState.open) {
            this.setState({
                filters: structuredClone(this.props.filterDefault ?? []),
                filterCached: structuredClone(this.props.filterCached ?? []),
                showPasteArea: false,
                pasteText: '',
                unparsedText: [],
            });
            this.hasChanges = false;
        }
    }

    componentWillUnmount() {
        StateManager.unsubscribeState({
            [`FilterModal_${this.props.name}`]: [`onSubShowFilterModal`],
        });
    }

    private handleSave = () => {
        if (!this.props.filterSetter) {
            return;
        }

        const isValid = (f: IPivotParamsFilter) =>
            f.filterBy === '$between'
                ? f.from != null && f.from !== '' && f.to != null && f.to !== ''
                : f.value != null && f.value !== '';

        const validFilters = this.state.filters.filter(isValid).map((f) => ({ ...f, id: uuidv4() }));

        const filterData = {
            filters: validFilters,
            filterCached: this.state.filterCached,
        };

        this.props.filterSetter(filterData);
    };

    private buildRefContainer() {
        const { filters } = this.state;

        const cached = filters[0]?.cached && filters[0]?.cached.length > 0 ? filters[0].cached : this.state.filterCached ?? [];

        return {
            id: this.refContainerId,
            filterBy: '$eq' as TFilterBy,
            comparison: 'or' as const,
            type: this.props.type,
            items: filters.map((f) => ({
                filterBy: f.filterBy,
                label: f.label,
                value: f.value,
                level: f.level ?? 0,
            })),
            cached,
        };
    }

    private buildContainer(filter: IPivotParamsFilter) {
        return {
            id: filter.id,
            filterBy: filter.filterBy,
            comparison: filter.comparison,
            type: this.props.type,
            items: [filter.filterBy === '$between' ? { from: filter.from, to: filter.to } : { value: filter.value }],
        };
    }

    onSelectFilter = ({ id, items, filterBy, comparison, cached }: IOnSelectFilterParam): void => {
        this.hasChanges = true;

        if (this.props.metaref) {
            // Для ref: items — весь список выбранных значений, заменяем целиком
            this.setState({
                filters: (items as TFilterRefItem[]).map((item) => ({
                    id: uuidv4(),
                    filterBy: filterBy ?? '$eq',
                    comparison: comparison ?? 'or',
                    label: item.label,
                    value: item.value,
                    from: item.value,
                    to: item.value,
                    level: item.level ?? null,
                })),
                filterCached: cached ?? [],
            });
            return;
        }

        // Для date / number / string: обновляем конкретный фильтр по id
        this.setState((prev) => ({
            filters: prev.filters.map((f) => {
                if (f.id !== id) return f;
                const [item] = Array.isArray(items) ? items : [];
                if (!item) {
                    return {
                        ...f,
                        filterBy: filterBy || f.filterBy,
                        comparison: comparison || f.comparison,
                    };
                }
                const isRange = 'from' in item;
                return {
                    ...f,
                    filterBy: filterBy || f.filterBy,
                    comparison: comparison || f.comparison,
                    value: isRange ? (item as TFilterRangeItem).from : (item as TFilterValueItem).value,
                    from: isRange ? (item as TFilterRangeItem).from : (item as TFilterValueItem).value,
                    to: isRange ? (item as TFilterRangeItem).to : (item as TFilterValueItem).value,
                };
            }),
        }));
    };

    public reset = () => {
        this.hasChanges = true;
        this.setState(
            {
                filterCached: [], // Очищаем только кеш
            },
            () => {
                this.props.filterSetter({
                    filters: this.state.filters,
                    filterCached: [], // Очищаем кеш
                });
            },
        );
    };

    onAddFilter = () => {
        this.hasChanges = true;

        const { type } = this.props;
        const isRange = includes(FILTER_TYPES_DATE, type) || includes(FILTER_TYPES_NUMBER, type);
        this.setState((prev) => ({
            filters: [
                ...prev.filters,
                {
                    id: uuidv4(),
                    filterBy: isRange ? '$between' : '$eq',
                    comparison: 'or',
                    label: '',
                    value: '',
                    from: '',
                    to: '',
                } as IPivotParamsFilter,
            ],
        }));
    };

    onDeleteFilter = (id: string) => {
        this.hasChanges = true;

        this.setState((prev) => ({
            filters: prev.filters.filter((f) => f.id !== id),
        }));
    };

    openPasteArea = () => {
        this.setState({ showPasteArea: true, unparsedText: [] });
    };

    closePasteArea = () => {
        this.setState({ showPasteArea: false, pasteText: '', unparsedText: [] });
    };

    handlePasteTextChange = (val: string) => {
        this.setState({ pasteText: val });
    };

    clearUnparsedText = () => {
        this.setState({ unparsedText: [] });
    };

    handlePasteConfirm = () => {
        const { pasteText } = this.state;
        const validOps = getValidOperatorsForType(this.props.type);
        const { items: parsed, unparsed } = parseFilterString(pasteText, validOps);

        if (parsed.length === 0) {
            this.setState({ unparsedText: unparsed });
            this.closePasteArea();
            return;
        }

        const isDateType = includes(FILTER_TYPES_DATE, this.props.type);

        const expandFilter = (operator: TFilterBy, values: string[], comparison: 'or' | 'and'): IPivotParamsFilter[] => {
            if (operator === '$between') {
                const [from, to] = values;
                return [
                    {
                        id: uuidv4(),
                        filterBy: operator,
                        comparison,
                        label: '',
                        value: '',
                        from: isDateType ? parseDateString(from) ?? '' : from ?? '',
                        to: isDateType ? parseDateString(to) ?? '' : to ?? '',
                    },
                ];
            }

            return values.flatMap((v) => {
                const normalizedValue = isDateType ? parseDateString(v) : v;
                return normalizedValue
                    ? [
                          {
                              id: uuidv4(),
                              filterBy: operator,
                              comparison,
                              label: '',
                              value: normalizedValue,
                              from: '',
                              to: '',
                          },
                      ]
                    : [];
            });
        };

        const newFilters = parsed.flatMap(({ operator, values, comparison }) =>
            expandFilter(operator as TFilterBy, values, comparison),
        );

        this.setState((prev) => ({
            filters: [...prev.filters, ...newFilters],
            showPasteArea: false,
            unparsedText: unparsed,
        }));

        this.hasChanges = true;
    };

    handleClose = () => {
        if (this.hasChanges) {
            this.handleSave();
            this.hasChanges = false;
            this.closePasteArea();
        }
        StateManager.setState({ [`FilterModal_${this.props.name}`]: { open: false } });
    };

    render() {
        const { type, name, server, metaref, children } = this.props;
        const { open, trigger, filters } = this.state;

        return (
            <Popover
                className={style.container}
                opened={open}
                onOpened={(v) => {
                    if (!v && this.hasChanges) {
                        this.handleSave();
                        this.hasChanges = false;
                    }
                    StateManager.setState({ [`FilterModal_${this.props.name}`]: { open: v } });
                }}
                widthMode="auto"
                placement="top-start"
                content={
                    <>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%',
                                marginBottom: 'var(--ui-kit-spacing-8)',
                            }}
                        >
                            <Typography variant="heading5">{this.props.title}</Typography>

                            <IconButton
                                onClick={this.handleClose}
                                icon={CloseIcon}
                                title="Закрыть"
                                variant="text"
                                color="secondary"
                                size="small"
                            />
                        </div>
                        <div className={style.wrap}>
                            {metaref ? (
                                <FilterRef
                                    field={name}
                                    server={server}
                                    type={type}
                                    metaRefId={metaref.value}
                                    container={this.buildRefContainer()}
                                    onChange={this.onSelectFilter}
                                    reset={this.reset}
                                />
                            ) : (
                                filters.map((filter, index) => (
                                    <div key={filter.id}>
                                        {includes(FILTER_TYPES_DATE, type) && (
                                            <FilterDate
                                                isFirst={index === 0}
                                                field={name}
                                                container={this.buildContainer(filter)}
                                                type={type}
                                                // @ts-expect-error
                                                onChange={this.onSelectFilter}
                                                onDeleteFilter={this.onDeleteFilter}
                                                autoFocus={index === filters.length - 1}
                                            />
                                        )}
                                        {includes(FILTER_TYPES_NUMBER, type) && (
                                            <FilterNumber
                                                isFirst={index === 0}
                                                field={name}
                                                container={this.buildContainer(filter)}
                                                type={type}
                                                // @ts-expect-error
                                                onChange={this.onSelectFilter}
                                                onDeleteFilter={this.onDeleteFilter}
                                                autoFocus={index === filters.length - 1}
                                            />
                                        )}
                                        {!includes(FILTER_TYPES_ALL, type) && (
                                            <FilterString
                                                isFirst={index === 0}
                                                field={name}
                                                container={this.buildContainer(filter)}
                                                // @ts-expect-error
                                                onChange={this.onSelectFilter}
                                                onDeleteFilter={this.onDeleteFilter}
                                                autoFocus={index === filters.length - 1}
                                            />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {!metaref && (
                            <div
                                style={{
                                    marginTop: 'var(--ui-kit-spacing-8)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--ui-kit-spacing-4)',
                                }}
                            >
                                {this.state.showPasteArea ? (
                                    <div className={style.pasteArea}>
                                        <TextArea
                                            placeholder={getPastePlaceholder(this.props.type)}
                                            value={this.state.pasteText}
                                            onChange={(e) => this.handlePasteTextChange(e.target.value)}
                                        />
                                        <div className={style.pasteAreaBtns}>
                                            <Button
                                                onClick={this.handlePasteConfirm}
                                                variant="contained"
                                                color="primary"
                                                disabled={!this.state.pasteText.trim()}
                                            >
                                                Применить
                                            </Button>
                                            <Button onClick={this.closePasteArea} variant="outlined" color="secondary">
                                                Закрыть
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={style.actionsBtns}>
                                        <Button
                                            onClick={this.onAddFilter}
                                            variant="outlined"
                                            color="success"
                                            style={{ flex: 1 }}
                                        >
                                            + Условие
                                        </Button>
                                        <Button
                                            onClick={this.openPasteArea}
                                            variant="outlined"
                                            color="primary"
                                            style={{ flex: 1 }}
                                        >
                                            Вставка
                                        </Button>
                                    </div>
                                )}

                                {this.state.unparsedText.length > 0 && (
                                    <div className={style.unparsedSection}>
                                        <div className={style.unparsedHeader}>
                                            <Typography
                                                variant="captiontext"
                                                className={style.unparsedTitle}
                                                style={{ color: 'var(--ui-kit-colors-alert-warning)' }}
                                            >
                                                Не удалось распознать:
                                            </Typography>
                                            <IconButton
                                                onClick={this.clearUnparsedText}
                                                icon={CloseIcon}
                                                variant="text"
                                                color="secondary"
                                                size="small"
                                            />
                                        </div>
                                        <div className={style.unparsedList}>
                                            {this.state.unparsedText.map((line, i) => (
                                                <Typography
                                                    key={i}
                                                    variant="captiontext"
                                                    className={style.unparsedItem}
                                                    style={{ color: 'var(--ui-kit-colors-alert-warning)' }}
                                                >
                                                    {line}
                                                </Typography>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                }
            >
                {children}
            </Popover>
        );
    }
}
