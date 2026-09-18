/* eslint-disable no-nested-ternary */
import cn from 'classnames';
import React, { Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    ButtonColors,
    Checkbox,
    ClearIcon,
    DropDownIcon,
    IconButton,
    Input,
    LoaderIcon,
    MinusIcon,
    PlusIcon,
    Popover,
    SearchIcon,
    StarFillIcon,
    StarOutlineIcon,
    Typography,
    UsersIcon,
} from 'ui-kit';

import $api from '../../../../../helpers/axios';
import $message from '../../../../ui/message.helper';
import ServerContext from '../../../ServerContext';
import styles from './style.module.css';
import { Category, Schema, SchemaSelectProps, SchemaSelectState } from './types';

// TODO: Не должно быть такого хардкода
// Да и вообще этот компонент отрефакторить бы
const GUIDE_ID = '0b0595bb-d11e-49f7-8b76-15e2b6cd43a5';

interface IStandardButtonProps {
    id: string;
    standart: boolean;
    onChange?: (id: string, newValue: boolean) => void;
}

const StandartButton: React.FC<IStandardButtonProps> = ({
    id,
    standart: propsStandart,
    onChange = () => {},
}: IStandardButtonProps) => {
    const server = useContext(ServerContext);

    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const [standart, setStandart] = useState(propsStandart);

    useEffect(() => {
        setStandart(propsStandart);
    }, [propsStandart]);

    const [loading, setLoading] = useState(false);

    const handleClick = useCallback(async () => {
        if (mounted.current) setLoading(true);
        try {
            await $api
                .put(`${server ? `/to/${server}` : ''}/metadata/guide/${GUIDE_ID}`, { id, standart_schema: !standart })
                .then(({ data }) => {
                    if (!data.result) {
                        throw new Error('Недостаточно прав для изменения схемы');
                    }

                    return data.result;
                });
            setStandart(!standart);
            onChange(id, !standart);
        } catch (e) {
            const error = e as Error;
            console.error('Не удалось изменить схему', error);
            $message.show(error.message);
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [server, id, standart]);

    let color: ButtonColors = 'secondary';
    if (!loading && standart) {
        color = 'primary';
    }

    let icon = LoaderIcon;
    if (!loading) {
        if (standart) {
            icon = StarFillIcon;
        } else {
            icon = StarOutlineIcon;
        }
    }

    return <IconButton size="small" color={color} variant="text" icon={icon} onClick={handleClick} />;
};

export class SchemaSelect extends React.Component<SchemaSelectProps, SchemaSelectState> {
    static contextType = ServerContext;

    constructor(props: SchemaSelectProps) {
        super(props);
        this.state = {
            isPopoverOpen: false,
            searchValue: '',
            expandedCategories: this.getInitialExpandedCategories(props.treeSchemas, props.selectedValue),
        };
    }

    getInitialExpandedCategories(treeSchemas: Category[], selectedValue?: string): Record<string, boolean> {
        const expandedCategories: Record<string, boolean> = {};

        if (treeSchemas && treeSchemas.length > 0) {
            treeSchemas.forEach((category) => {
                expandedCategories[category.value] = false;
            });

            if (selectedValue) {
                for (const category of treeSchemas) {
                    const hasSelectedSchema = category.children.some((schema) => schema.id === selectedValue);

                    if (hasSelectedSchema) {
                        expandedCategories[category.value] = true;
                        return expandedCategories;
                    }
                }
            }

            if (treeSchemas.length > 0) {
                expandedCategories[treeSchemas[0].value] = true;
            }
        }

        return expandedCategories;
    }

    componentDidUpdate(prevProps: SchemaSelectProps) {
        const { treeSchemas, selectedValue } = this.props;
        const { isPopoverOpen } = this.state;

        if (isPopoverOpen && (prevProps.treeSchemas !== treeSchemas || prevProps.selectedValue !== selectedValue)) {
            const currentExpanded = this.state.expandedCategories;

            const newInitialExpanded = this.getInitialExpandedCategories(treeSchemas, selectedValue);

            const mergedExpanded = { ...newInitialExpanded };

            Object.keys(currentExpanded).forEach((key) => {
                if (currentExpanded[key] === true) {
                    mergedExpanded[key] = true;
                }
            });

            this.setState({
                expandedCategories: mergedExpanded,
            });
        }
    }

    toggleCategory = (categoryValue: string, event: React.MouseEvent): void => {
        event.stopPropagation();

        this.setState((prevState) => ({
            expandedCategories: {
                ...prevState.expandedCategories,
                [categoryValue]: !(prevState.expandedCategories?.[categoryValue] !== false),
            },
        }));
    };

    filterSchemasBySearch = (schemas: Schema[]): Schema[] => {
        const { searchValue } = this.state;
        if (!searchValue) return schemas;

        return schemas.filter((schema) => schema.name.toLowerCase().includes(searchValue.toLowerCase()));
    };

    handleSchemaSelect = (schemaValue: string): void => {
        this.props.onChange(schemaValue);
        this.setState({ isPopoverOpen: false, searchValue: '' });
    };

    getIconColor = (forAll: boolean, givenPermissions: boolean) => {
        if (forAll) return 'warning';
        if (givenPermissions) return 'secondary';
        return undefined;
    };

    handlePopoverOpenChange = (open: boolean): void => {
        if (open) {
            this.setState({
                isPopoverOpen: open,
                searchValue: '',
                expandedCategories: this.getInitialExpandedCategories(this.props.treeSchemas, this.props.selectedValue),
            });
        } else {
            this.setState({
                isPopoverOpen: open,
                searchValue: '',
            });
        }
    };

    handleClearSearch = (): void => {
        this.setState({ searchValue: '' });
    };

    render() {
        const { treeSchemas, selectedValue, schemasList, disabled = false, placeholder = 'Выберите схему' } = this.props;
        const { isPopoverOpen, searchValue, expandedCategories } = this.state;

        const selectedSchema = schemasList?.find((s) => s.id === selectedValue);

        const showEmptyList = treeSchemas.length === 0 && !searchValue;
        const hasSearchResults = treeSchemas.some((category) => this.filterSchemasBySearch(category.children).length > 0);
        const showEmptySearch = treeSchemas.length > 0 && !hasSearchResults && !!searchValue;

        return (
            <Popover
                widthMode="auto"
                containerFullWidth
                opened={isPopoverOpen}
                onOpened={this.handlePopoverOpenChange}
                content={
                    <div className={styles.popoverContent}>
                        <div className={styles.searchContainer}>
                            <Input
                                placeholder="Поиск"
                                value={searchValue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    this.setState({ searchValue: e.target.value })
                                }
                                fullWidth
                                variant="outlined"
                                leftIcon={SearchIcon}
                                rightIcon={searchValue ? ClearIcon : undefined}
                                onClickRightIcon={this.handleClearSearch}
                            />
                        </div>

                        <div className={styles.schemasList}>
                            {treeSchemas.map((category) => {
                                const filteredChildren = this.filterSchemasBySearch(category.children);

                                if (filteredChildren.length === 0 && searchValue) {
                                    return null;
                                }

                                const isExpanded = expandedCategories?.[category.value] === true;

                                return (
                                    <Fragment key={category.value}>
                                        <div className={styles.container}>
                                            <div className={cn(styles.label, styles.group)}>
                                                <IconButton
                                                    size="small"
                                                    color="secondary"
                                                    variant="text"
                                                    onClick={(e) => this.toggleCategory(category.value, e)}
                                                    icon={isExpanded ? MinusIcon : PlusIcon}
                                                />
                                                <span
                                                    style={{ position: 'relative', paddingRight: 'var(--ui-kit-spacing-2)' }}
                                                >
                                                    {category.label}
                                                    <Typography variant="captiontext" className={styles.badge}>
                                                        {category.children.length}
                                                    </Typography>
                                                </span>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            filteredChildren.length > 0 ? (
                                                filteredChildren.map((schema) => (
                                                    <div key={schema.id} className={cn(styles.container, styles.select__item)}>
                                                        <div className={styles.label}>
                                                            <Checkbox
                                                                checked={selectedValue === schema.id}
                                                                label={schema.name}
                                                                value={schema.id}
                                                                disabled={disabled}
                                                                onChange={(e) => {
                                                                    const { checked } = e.target;
                                                                    this.handleSchemaSelect(checked ? schema.id : '');
                                                                }}
                                                            />
                                                        </div>
                                                        <div className={styles.iconsWrap}>
                                                            {category.value === 'personal' &&
                                                                schema.givenPermissions !== undefined &&
                                                                (schema.forAll || schema.givenPermissions ? (
                                                                    <UsersIcon
                                                                        size="small"
                                                                        color={this.getIconColor(
                                                                            schema.forAll,
                                                                            schema.givenPermissions,
                                                                        )}
                                                                    />
                                                                ) : null)}
                                                            <StandartButton
                                                                id={schema.id}
                                                                standart={schema.standart}
                                                                onChange={() => this.props.getSchemaList?.(false)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={styles.container}>
                                                    <div className={styles.label}>
                                                        <div className={styles.icon_container} />
                                                        Нет схем в этой категории
                                                    </div>
                                                </div>
                                            )
                                        ) : null}
                                    </Fragment>
                                );
                            })}

                            {showEmptyList && <div className={styles.emptyList}>Нет доступных схем</div>}

                            {showEmptySearch && <div className={styles.emptySearch}>Схемы не найдены</div>}
                        </div>
                    </div>
                }
                placement="bottom-start"
            >
                <div className={styles.selectorWrapper}>
                    <div className={styles.selector}>{selectedSchema?.name || placeholder}</div>
                    <DropDownIcon
                        size="small"
                        className={styles.icon}
                        style={{ transform: isPopoverOpen ? 'rotate(180deg)' : undefined }}
                    />
                </div>
            </Popover>
        );
    }
}
