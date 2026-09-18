import { Component, ReactNode } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import $api from 'helpers/axios';
import style from '../matrix.module.css';
import { DragScrollController } from 'components/MatrixTable/lib/DragScrollController';
import { ApiResponse, MTableProps, MTableState } from 'components/MatrixTable/types';
import { MTableHead } from 'components/MatrixTable/components/MTableHead';
import { MTableRow } from 'components/MatrixTable/components/MTableRow';

type MatrixRowEntry = [string, { name: string }];
type MatrixColumnEntry = [string, { name: string }];

/**
 * Компонент матричной таблицы для управления связями
 * (роли-права, пользователи-роли, пользователи-группы, пользователи-права).
 */
export class MTable extends Component<MTableProps, MTableState> {
    private readonly dragCtrl = new DragScrollController(style.horizontalScroll_dragging);

    constructor(props: MTableProps) {
        super(props);
        this.state = {
            data: null,
            loading: false,
            error: null,
        };
    }

    componentWillUnmount(): void {
        this.dragCtrl.destroy();
    }

    private fetchData = (): void => {
        const { entity } = this.props;
        this.setState({ loading: true, error: null });

        const url = `/usersui/matrix/${entity}`;

        $api.get(url)
            .then((res) => {
                this.setState({
                    data: res.data as ApiResponse,
                    loading: false,
                });
            })
            .catch((err) => {
                console.error(`[MTable] Ошибка ${entity}:`, err);
                this.setState({
                    error: err.message,
                    loading: false,
                });
            });
    };

    private handleCellClick = (colUuid: string, rowUuid: string, rowIdx: number, colIdx: number, isChecked: boolean): void => {
        const { resourceName, idField, togglePath } = this.props;

        // оптимистичное обновление
        const matrixKey = `${rowIdx}_${colIdx}`;
        const newAllMatrix = [...(this.state.data?.AllMatrix || [])];
        if (isChecked) {
            const idx = newAllMatrix.indexOf(matrixKey);
            if (idx !== -1) newAllMatrix.splice(idx, 1);
        } else {
            newAllMatrix.push(matrixKey);
        }
        this.setState((prev) => ({
            data: prev.data ? { ...prev.data, AllMatrix: newAllMatrix } : prev.data,
        }));

        const url = `/usersui/${resourceName}/${rowUuid}/${togglePath}`;
        const body = { [idField]: colUuid };
        const text = isChecked ? 'Удаление' : 'Добавление';

        const request = isChecked ? $api.delete(url, { data: body }) : $api.post(url, body);

        request
            .then((res) => {
                // если сервер вернул актуальный AllMatrix — используем его
                if (res.data?.AllMatrix) {
                    this.setState((prev) => ({
                        data: prev.data ? { ...prev.data, AllMatrix: res.data.AllMatrix } : prev.data,
                    }));
                }
            })
            .catch((err) => {
                console.error(`[MTable] Ошибка ${text} ${this.props.entity}:`, err);
                // откат оптимистичного обновления
                this.fetchData();
            });
    };

    componentDidMount(): void {
        this.fetchData();
    }

    render(): ReactNode {
        const { entity, name, columnsKey, rowsKey } = this.props;
        const { data, loading, error } = this.state;

        if (loading) {
            return <div className={style.matrixLoading}>Загрузка {name || entity}...</div>;
        }
        if (error) {
            return <div className={style.matrixError}>Ошибка: {error}</div>;
        }
        if (!data) {
            return <div className={style.matrixEmpty}>Нет данных для {name || entity}</div>;
        }

        const columnsObj = data[columnsKey];
        const rowsObj = data[rowsKey];

        if (!columnsObj || !rowsObj) {
            return <div className={style.matrixEmpty}>Неверный формат данных для {name || entity}</div>;
        }

        const columnsRaw: MatrixColumnEntry[] = Object.entries(columnsObj);
        const rows: MatrixRowEntry[] = Object.entries(rowsObj);
        const matrixSet = new Set<string>(data.AllMatrix || []);

        const columns = columnsRaw.map(([uuid, colObj]) => ({
            uuid,
            name: colObj.name,
        }));

        return (
            <div className={style.wrapper}>
                <div
                    className={style.horizontalScroll}
                    ref={this.dragCtrl.ref}
                    onPointerDown={this.dragCtrl.onPointerDown}
                    onPointerMove={this.dragCtrl.onPointerMove}
                    onPointerUp={this.dragCtrl.onPointerUp}
                    onPointerCancel={this.dragCtrl.onPointerCancel}
                >
                    <TableVirtuoso
                        style={{ height: '100%' }}
                        data={rows}
                        // eslint-disable-next-line react/no-unstable-nested-components
                        fixedHeaderContent={() => <MTableHead columns={columns} />}
                        // eslint-disable-next-line react/no-unstable-nested-components
                        itemContent={(index, row) => (
                            <MTableRow
                                rowIdx={index}
                                rowUuid={row[0]}
                                rowName={row[1].name}
                                columns={columns}
                                matrixSet={matrixSet}
                                onCellClick={this.handleCellClick}
                            />
                        )}
                    />
                </div>
            </div>
        );
    }
}
