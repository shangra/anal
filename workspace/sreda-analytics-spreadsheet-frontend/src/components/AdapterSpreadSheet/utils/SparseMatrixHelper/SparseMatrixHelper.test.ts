import { ICell } from '../../types';
import { SparseMatrixHelper } from './SparseMatrixHelper';

const cellValueExample1: ICell = {
    components: [],
    data: 20,
};

const cellValueExample2: ICell = {
    components: [],
    data: 'abc',
};

type MatrixVectorType = Record<number, ICell>;
type MatrixType = Record<number, MatrixVectorType>;

const vectorToMap = (vector: MatrixVectorType): Map<number, ICell> => {
    const dist = new Map<number, ICell>();

    for (const columnIndex in vector) {
        if (Object.prototype.hasOwnProperty.call(vector, columnIndex)) {
            const intColumnIndex = parseInt(columnIndex, 10);
            if (Object.prototype.hasOwnProperty.call(vector, intColumnIndex)) {
                const element = vector[intColumnIndex];

                dist.set(intColumnIndex, element);
            }
        }
    }

    return dist;
};

const matrixToMap = (matrix: MatrixType): Map<number, Map<number, ICell>> => {
    const dist = new Map<number, Map<number, ICell>>();

    for (const rowIndex in matrix) {
        if (Object.prototype.hasOwnProperty.call(matrix, rowIndex)) {
            const intRowIndex = parseInt(rowIndex, 10);

            if (Object.prototype.hasOwnProperty.call(matrix, intRowIndex)) {
                const vector = matrix[intRowIndex];

                dist.set(intRowIndex, vectorToMap(vector));
            }
        }
    }

    return dist;
};

type GetCellTestCaseType = {
    arrange: {
        matrix: MatrixType;
        rowIndex: number;
        columnIndex: number;
    };
    expected: {
        cell: ICell | null;
    };
    message: string;
};
const GetCellTestCases: GetCellTestCaseType[] = [
    {
        arrange: {
            matrix: {},
            columnIndex: -1,
            rowIndex: -1,
        },
        expected: {
            cell: null,
        },
        message: 'Должен возвращать null, при попытке получения ячейки с отрицательными индексам',
    },
    {
        arrange: {
            matrix: {},
            columnIndex: 0,
            rowIndex: 0,
        },
        expected: {
            cell: null,
        },
        message: 'Должен возвращать null, при попытке получения ячейки из пустой матрицы',
    },
    {
        arrange: {
            matrix: {
                0: {
                    1: cellValueExample1,
                },
            },
            rowIndex: 0,
            columnIndex: 1,
        },
        expected: {
            cell: cellValueExample1,
        },
        message: 'Должен возвращать найденную ячейку',
    },
    {
        arrange: {
            matrix: {
                0: {
                    1: cellValueExample1,
                },
            },
            rowIndex: 1,
            columnIndex: 0,
        },
        expected: {
            cell: null,
        },
        message: 'Должен возвращать null, при ненайденной',
    },
];

type SetCellTestCaseType = {
    arrange: {
        matrix: MatrixType;
        rowIndex: number;
        columnIndex: number;
        cell: ICell;
    };
    expected: {
        matrix: MatrixType;
    };
    message: string;
};
const SetCellTestCases: SetCellTestCaseType[] = [
    {
        arrange: {
            matrix: {},
            rowIndex: -1,
            columnIndex: -1,
            cell: cellValueExample1,
        },
        expected: {
            matrix: {},
        },
        message: 'Должен обрабатывать попытку установки ячейки c отрицательными индексами',
    },
    {
        arrange: {
            matrix: {},
            rowIndex: 1,
            columnIndex: 0,
            cell: cellValueExample1,
        },
        expected: {
            matrix: {
                1: {
                    0: cellValueExample1,
                },
            },
        },
        message: 'Должен вставлять ячейку в пустую матрицу',
    },
    {
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                6: {
                    3: cellValueExample2,
                },
            },
            rowIndex: 1,
            columnIndex: 2,
            cell: cellValueExample1,
        },
        expected: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample1,
                },
                6: {
                    3: cellValueExample2,
                },
            },
        },
        message: 'Должен вставлять ячейку в занятые координаты',
    },
];

type InsertColumnTestCaseType = {
    arrange: {
        matrix: MatrixType;
        columnIndex: number;
        position: 'before' | 'after';
    };
    expected: {
        matrix: MatrixType;
    };
    message: string;
};
const InsertColumnTestCases: InsertColumnTestCaseType[] = [
    {
        message: 'Должен вставлять колонку в пустую матрицы перед указанным индексом',
        arrange: {
            matrix: {},
            columnIndex: 0,
            position: 'before',
        },
        expected: {
            matrix: {},
        },
    },
    {
        message: 'Должен вставлять колонку в начало матрицы перед указанным индексом',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                6: {
                    3: cellValueExample2,
                },
            },
            columnIndex: 0,
            position: 'before',
        },
        expected: {
            matrix: {
                0: {
                    1: cellValueExample2,
                },
                1: {
                    3: cellValueExample2,
                },
                6: {
                    4: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен вставлять колонку в середину матрицы после указанного индекса',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                6: {
                    3: cellValueExample2,
                },
            },
            position: 'after',
            columnIndex: 3,
        },
        expected: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                6: {
                    3: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен вставлять колонку в конец матрицы после указанного индекса',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample1,
                },
                1: {
                    2: cellValueExample2,
                },
            },
            position: 'after',
            columnIndex: 1,
        },
        expected: {
            matrix: {
                0: {
                    0: cellValueExample1,
                },
                1: {
                    3: cellValueExample2,
                },
            },
        },
    },
];

type InsertRowTestCaseType = {
    arrange: {
        matrix: MatrixType;
        rowIndex: number;
        position: 'before' | 'after';
    };
    expected: {
        matrix: MatrixType;
    };
    message: string;
};
const InsertRowTestCases: InsertRowTestCaseType[] = [
    {
        message: 'Должен вставлять ряд в пустую матрицу выше указанного индекса',
        arrange: {
            matrix: {},
            position: 'before',
            rowIndex: 0,
        },
        expected: {
            matrix: {
                0: {},
            },
        },
    },
    {
        message: 'Должен вставлять ряд в начало матрицы выше указанного индекса',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                6: {
                    3: cellValueExample2,
                },
            },
            position: 'before',
            rowIndex: 0,
        },
        expected: {
            matrix: {
                0: {},
                1: {
                    0: cellValueExample2,
                },
                2: {
                    2: cellValueExample2,
                },
                7: {
                    3: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен вставлять строку ниже указанного индекса',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                6: {
                    3: cellValueExample2,
                },
            },
            position: 'after',
            rowIndex: 0,
        },
        expected: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {},
                2: {
                    2: cellValueExample2,
                },
                7: {
                    3: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен вставлять ряд в середину матрицы ниже указанного индекса',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                6: {
                    3: cellValueExample2,
                },
            },
            position: 'after',
            rowIndex: 3,
        },
        expected: {
            matrix: {
                0: {
                    0: cellValueExample2,
                },
                1: {
                    2: cellValueExample2,
                },
                4: {},
                7: {
                    3: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен вставлять строку в конец матрицы ниже указанного индекса',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample1,
                },
                1: {
                    2: cellValueExample2,
                },
            },
            position: 'after',
            rowIndex: 1,
        },
        expected: {
            matrix: {
                0: {
                    0: cellValueExample1,
                },
                1: {
                    2: cellValueExample2,
                },
                2: {},
            },
        },
    },
];

type DeleteRowTestCaseType = {
    arrange: {
        matrix: MatrixType;
        rowIndex: number;
    };
    expected: {
        matrix: MatrixType;
    };
    message: string;
};
const DeleteRowTestCases: DeleteRowTestCaseType[] = [
    {
        message: 'Должен обработать попытку удаления строки с отрицальным индексом',
        arrange: {
            matrix: {
                5: {
                    0: cellValueExample1,
                },
            },
            rowIndex: -1,
        },
        expected: {
            matrix: {
                5: {
                    0: cellValueExample1,
                },
            },
        },
    },
    {
        message: 'Должен удалить пустую строку из начала матрицы',
        arrange: {
            matrix: {
                0: {},
                5: {
                    0: cellValueExample1,
                },
            },
            rowIndex: 0,
        },
        expected: {
            matrix: {
                4: {
                    0: cellValueExample1,
                },
            },
        },
    },
    {
        message: 'Должен удалить строку с ячейками из начала матрицы',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample1,
                },
                1: {
                    2: cellValueExample2,
                },
            },
            rowIndex: 0,
        },
        expected: {
            matrix: {
                0: {
                    2: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен удалить строку с ячейками из середины матрицы',
        arrange: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                },
                10: {
                    2: cellValueExample1,
                },
                15: {
                    2: cellValueExample2,
                },
                24: {
                    2: cellValueExample2,
                },
            },
            rowIndex: 5,
        },
        expected: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                9: {
                    2: cellValueExample1,
                },
                14: {
                    2: cellValueExample2,
                },
                23: {
                    2: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен удалить строку с ячейками из конца матрицы',
        arrange: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                },
                10: {
                    2: cellValueExample1,
                },
                15: {
                    2: cellValueExample2,
                },
            },
            rowIndex: 15,
        },
        expected: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                },
                10: {
                    2: cellValueExample1,
                },
            },
        },
    },
    {
        message: 'Должен удалить пустую строку из конца матрицы',
        arrange: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                },
                10: {
                    2: cellValueExample1,
                },
                15: {
                    2: cellValueExample2,
                },
                16: {},
            },
            rowIndex: 16,
        },
        expected: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                },
                10: {
                    2: cellValueExample1,
                },
                15: {
                    2: cellValueExample2,
                },
            },
        },
    },
];

type DeleteColumnTestCaseType = {
    arrange: {
        matrix: MatrixType;
        columnIndex: number;
    };
    expected: {
        matrix: MatrixType;
    };
    message: string;
};
const DeleteColumnTestCases: DeleteColumnTestCaseType[] = [
    {
        message: 'Должен обработать попытку удаления вектора с отрицальным индексом',
        arrange: {
            matrix: {
                5: {
                    0: cellValueExample1,
                },
            },
            columnIndex: -1,
        },
        expected: {
            matrix: {
                5: {
                    0: cellValueExample1,
                },
            },
        },
    },
    {
        message: 'Должен удалить колонку из начала матрицы',
        arrange: {
            matrix: {
                0: {
                    0: cellValueExample1,
                },
                1: {
                    0: cellValueExample2,
                    2: cellValueExample2,
                },
            },
            columnIndex: 0,
        },
        expected: {
            matrix: {
                0: {},
                1: {
                    1: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен удалить колонку из середины матрицы',
        arrange: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                },
                10: {
                    2: cellValueExample1,
                },
                15: {
                    2: cellValueExample2,
                },
                24: {
                    3: cellValueExample2,
                },
            },
            columnIndex: 2,
        },
        expected: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {},
                10: {},
                15: {},
                24: {
                    2: cellValueExample2,
                },
            },
        },
    },
    {
        message: 'Должен удалить колонку из конца матрицы',
        arrange: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                    3: cellValueExample1,
                },
                10: {
                    2: cellValueExample1,
                },
                15: {
                    2: cellValueExample2,
                    3: cellValueExample1,
                },
            },
            columnIndex: 3,
        },
        expected: {
            matrix: {
                2: {
                    0: cellValueExample1,
                },
                5: {
                    2: cellValueExample2,
                },
                10: {
                    2: cellValueExample1,
                },
                15: {
                    2: cellValueExample2,
                },
            },
        },
    },
];

describe('AdapterSpreadSheet.utils.MatrixTransposer', () => {
    describe('Вставка ячейки', () => {
        SetCellTestCases.forEach((testCase) => {
            it(testCase.message, () => {
                // Act
                const actual = SparseMatrixHelper.setCell(
                    matrixToMap(testCase.arrange.matrix),
                    testCase.arrange.rowIndex,
                    testCase.arrange.columnIndex,
                    testCase.arrange.cell,
                );

                // Assert
                expect(actual).toMatchObject(matrixToMap(testCase.expected.matrix));
            });
        });
    });

    describe('Получение ячейки', () => {
        GetCellTestCases.forEach((testCase) => {
            it(testCase.message, () => {
                // Act
                const actual = SparseMatrixHelper.getCell(
                    matrixToMap(testCase.arrange.matrix),
                    testCase.arrange.rowIndex,
                    testCase.arrange.columnIndex,
                );

                // Assert
                expect(actual).toEqual(testCase.expected.cell);
            });
        });
    });

    describe('Вставка строки в матрицу', () => {
        InsertRowTestCases.forEach((testCase) => {
            it(testCase.message, () => {
                // Act
                const actual = SparseMatrixHelper.insertRow(
                    matrixToMap(testCase.arrange.matrix),
                    testCase.arrange.rowIndex,
                    testCase.arrange.position,
                );

                // Assert
                expect(actual).toMatchObject(matrixToMap(testCase.expected.matrix));
            });
        });
    });

    describe('Вставка колонки в матрицу', () => {
        InsertColumnTestCases.forEach((testCase) => {
            it(testCase.message, () => {
                // Act
                const actual = SparseMatrixHelper.insertColumn(
                    matrixToMap(testCase.arrange.matrix),
                    testCase.arrange.columnIndex,
                    testCase.arrange.position,
                );

                // Assert
                expect(actual).toMatchObject(matrixToMap(testCase.expected.matrix));
            });
        });
    });

    describe('Должен удалять колонку из матрицу', () => {
        DeleteColumnTestCases.forEach((testCase) => {
            it(testCase.message, () => {
                // Act
                const actual = SparseMatrixHelper.deleteColumn(
                    matrixToMap(testCase.arrange.matrix),
                    testCase.arrange.columnIndex,
                );

                // Assert
                expect(actual).toMatchObject(matrixToMap(testCase.expected.matrix));
            });
        });
    });

    describe('Должен удалять строку из матрицы', () => {
        DeleteRowTestCases.forEach((testCase) => {
            it(testCase.message, () => {
                // Act
                const actual = SparseMatrixHelper.deleteRow(matrixToMap(testCase.arrange.matrix), testCase.arrange.rowIndex);

                // Assert
                expect(actual).toMatchObject(matrixToMap(testCase.expected.matrix));
            });
        });
    });
});
