import React, { Component, KeyboardEvent } from 'react';

import styles from './styles.module.css';

// Типы для фигур Тетриса
type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type BoardType = CellValue[][];

// Определение фигур (тетромино)
const SHAPES: number[][][] = [
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    // J
    [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0],
    ],
    // L
    [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0],
    ],
    // O
    [
        [4, 4],
        [4, 4],
    ],
    // S
    [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
    ],
    // T
    [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0],
    ],
    // Z
    [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
    ],
];

// Минималистичные цвета для фигур
const COLORS = [
    '#ffffff', // пустая клетка
    '#3b82f6', // I - синий
    '#ef4444', // J - красный
    '#f59e0b', // L - оранжевый
    '#10b981', // O - зеленый
    '#8b5cf6', // S - фиолетовый
    '#06b6d4', // T - голубой
    '#ec4899', // Z - розовый
];

interface TetrisState {
    board: BoardType;
    currentPiece: number[][];
    piecePosition: { x: number; y: number };
    score: number;
    level: number;
    linesCleared: number;
    gameOver: boolean;
    isPaused: boolean;
    nextPiece: number[][];
}

interface TetrisProps {}

class Tetris extends Component<TetrisProps, TetrisState> {
    private gameInterval: NodeJS.Timeout | null = null;

    private gameSpeed: number = 1000;

    constructor(props: TetrisProps) {
        super(props);

        const initialBoard = this.createEmptyBoard();
        const firstPiece = this.getRandomPiece();
        const nextPiece = this.getRandomPiece();

        this.state = {
            board: initialBoard,
            currentPiece: firstPiece,
            piecePosition: { x: Math.floor(10 / 2) - Math.floor(firstPiece[0].length / 2), y: 0 },
            score: 0,
            level: 1,
            linesCleared: 0,
            gameOver: false,
            isPaused: false,
            nextPiece,
        };
    }

    componentDidMount() {
        this.startGame();
        window.addEventListener('keydown', this.handleKeyPress);
    }

    componentWillUnmount() {
        this.stopGame();
        window.removeEventListener('keydown', this.handleKeyPress);
    }

    createEmptyBoard(): BoardType {
        const board: BoardType = [];
        for (let row = 0; row < 20; row++) {
            board.push(Array(10).fill(0));
        }
        return board;
    }

    getRandomPiece(): number[][] {
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        return SHAPES[shapeIndex];
    }

    startGame = () => {
        this.gameSpeed = 1000 - (this.state.level - 1) * 50;
        if (this.gameSpeed < 100) this.gameSpeed = 100;

        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }

        this.gameInterval = setInterval(this.moveDown, this.gameSpeed);
    };

    stopGame = () => {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
    };

    togglePause = () => {
        const { isPaused } = this.state;

        if (isPaused) {
            this.startGame();
        } else {
            this.stopGame();
        }

        this.setState({ isPaused: !isPaused });
    };

    resetGame = () => {
        this.stopGame();

        const initialBoard = this.createEmptyBoard();
        const firstPiece = this.getRandomPiece();
        const nextPiece = this.getRandomPiece();

        this.setState(
            {
                board: initialBoard,
                currentPiece: firstPiece,
                piecePosition: { x: Math.floor(10 / 2) - Math.floor(firstPiece[0].length / 2), y: 0 },
                score: 0,
                level: 1,
                linesCleared: 0,
                gameOver: false,
                isPaused: false,
                nextPiece,
            },
            () => {
                this.startGame();
            },
        );
    };

    checkCollision(board: BoardType, piece: number[][], position: { x: number; y: number }): boolean {
        for (let row = 0; row < piece.length; row++) {
            for (let col = 0; col < piece[row].length; col++) {
                if (piece[row][col] !== 0) {
                    const newX = position.x + col;
                    const newY = position.y + row;

                    if (newX < 0 || newX >= 10 || newY >= 20) {
                        return true;
                    }

                    if (newY >= 0 && board[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    rotatePiece = () => {
        const { currentPiece, piecePosition, board } = this.state;

        const rotatedPiece: number[][] = [];
        const rows = currentPiece.length;
        const cols = currentPiece[0].length;

        for (let col = 0; col < cols; col++) {
            rotatedPiece[col] = [];
            for (let row = rows - 1; row >= 0; row--) {
                rotatedPiece[col][rows - 1 - row] = currentPiece[row][col];
            }
        }

        if (!this.checkCollision(board, rotatedPiece, piecePosition)) {
            this.setState({ currentPiece: rotatedPiece });
        }
    };

    moveLeft = () => {
        const { piecePosition, currentPiece, board } = this.state;
        const newPosition = { ...piecePosition, x: piecePosition.x - 1 };

        if (!this.checkCollision(board, currentPiece, newPosition)) {
            this.setState({ piecePosition: newPosition });
        }
    };

    moveRight = () => {
        const { piecePosition, currentPiece, board } = this.state;
        const newPosition = { ...piecePosition, x: piecePosition.x + 1 };

        if (!this.checkCollision(board, currentPiece, newPosition)) {
            this.setState({ piecePosition: newPosition });
        }
    };

    moveDown = () => {
        const { piecePosition, currentPiece, board } = this.state;
        const newPosition = { ...piecePosition, y: piecePosition.y + 1 };

        if (!this.checkCollision(board, currentPiece, newPosition)) {
            this.setState({ piecePosition: newPosition });
        } else {
            this.placePiece();
        }
    };

    hardDrop = () => {
        const { piecePosition, currentPiece, board } = this.state;
        let newY = piecePosition.y;

        while (!this.checkCollision(board, currentPiece, { ...piecePosition, y: newY + 1 })) {
            newY++;
        }

        const newPosition = { ...piecePosition, y: newY };
        this.setState({ piecePosition: newPosition }, () => {
            this.placePiece();
        });
    };

    placePiece = () => {
        const { board, currentPiece, piecePosition, nextPiece } = this.state;
        const newBoard = [...board.map((row) => [...row])];

        for (let row = 0; row < currentPiece.length; row++) {
            for (let col = 0; col < currentPiece[row].length; col++) {
                if (currentPiece[row][col] !== 0) {
                    const boardY = piecePosition.y + row;
                    const boardX = piecePosition.x + col;

                    if (boardY >= 0) {
                        newBoard[boardY][boardX] = currentPiece[row][col] as CellValue;
                    }
                }
            }
        }

        const linesToClear = this.checkLines(newBoard);
        const newScore = this.calculateScore(linesToClear);
        const newLinesCleared = this.state.linesCleared + linesToClear.length;
        const newLevel = Math.floor(newLinesCleared / 10) + 1;

        const finalBoard = linesToClear.length > 0 ? this.clearLines(newBoard, linesToClear) : newBoard;

        this.setState(
            (prevState) => ({
                board: finalBoard,
                currentPiece: nextPiece,
                nextPiece: this.getRandomPiece(),
                piecePosition: {
                    x: Math.floor(10 / 2) - Math.floor(nextPiece[0].length / 2),
                    y: 0,
                },
                score: prevState.score + newScore,
                linesCleared: newLinesCleared,
                level: newLevel,
            }),
            () => {
                if (this.checkCollision(this.state.board, nextPiece, this.state.piecePosition)) {
                    this.setState({ gameOver: true });
                    this.stopGame();
                }

                if (newLevel !== this.state.level) {
                    this.gameSpeed = 1000 - (newLevel - 1) * 50;
                    if (this.gameSpeed < 100) this.gameSpeed = 100;

                    if (this.gameInterval) {
                        clearInterval(this.gameInterval);
                        this.gameInterval = setInterval(this.moveDown, this.gameSpeed);
                    }
                }
            },
        );
    };

    checkLines(board: BoardType): number[] {
        const linesToClear: number[] = [];

        for (let row = 0; row < board.length; row++) {
            if (board[row].every((cell) => cell !== 0)) {
                linesToClear.push(row);
            }
        }

        return linesToClear;
    }

    clearLines(board: BoardType, lines: number[]): BoardType {
        const newBoard = [...board];

        lines.forEach((row) => {
            newBoard.splice(row, 1);
            newBoard.unshift(Array(10).fill(0));
        });

        return newBoard;
    }

    calculateScore(lines: number[]): number {
        const lineCount = lines.length;

        switch (lineCount) {
            case 1:
                return 100 * this.state.level;
            case 2:
                return 300 * this.state.level;
            case 3:
                return 500 * this.state.level;
            case 4:
                return 800 * this.state.level;
            default:
                return 0;
        }
    }

    handleKeyPress = (e: globalThis.KeyboardEvent) => {
        const { gameOver, isPaused } = this.state;

        if (gameOver || isPaused) {
            if (e.key === 'Enter' || e.key === ' ') {
                if (gameOver) {
                    this.resetGame();
                } else {
                    this.togglePause();
                }
            }
            return;
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.moveLeft();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.moveRight();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.moveDown();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.rotatePiece();
                break;
            case ' ':
                e.preventDefault();
                this.hardDrop();
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                this.togglePause();
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                this.resetGame();
                break;
            default:
                break;
        }
    };

    renderBoard() {
        const { board, currentPiece, piecePosition } = this.state;
        const displayBoard = [...board.map((row) => [...row])];

        for (let row = 0; row < currentPiece.length; row++) {
            for (let col = 0; col < currentPiece[row].length; col++) {
                if (currentPiece[row][col] !== 0) {
                    const boardY = piecePosition.y + row;
                    const boardX = piecePosition.x + col;

                    if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
                        displayBoard[boardY][boardX] = currentPiece[row][col] as CellValue;
                    }
                }
            }
        }

        return (
            <div className={styles['board-container']}>
                <div className={styles['game-board']}>
                    {displayBoard.map((row, rowIndex) => (
                        <div key={rowIndex} className={styles['board-row']}>
                            {row.map((cell, cellIndex) => (
                                <div
                                    key={cellIndex}
                                    className={`cell ${cell > 0 ? 'filled' : ''}`}
                                    style={{
                                        backgroundColor: cell > 0 ? COLORS[cell] : 'transparent',
                                        borderColor: cell > 0 ? COLORS[cell] : '#e5e5e5',
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    renderNextPiece() {
        const { nextPiece } = this.state;

        return (
            <div className={styles['next-piece']}>
                <div className={styles['next-piece-label']}>Next</div>
                <div className={styles['next-piece-grid']}>
                    {Array.from({ length: 4 }).map((_, rowIndex) => (
                        <div key={rowIndex} className={styles['next-piece-row']}>
                            {Array.from({ length: 4 }).map((_, colIndex) => {
                                const cell =
                                    rowIndex < nextPiece.length && colIndex < nextPiece[0]?.length
                                        ? nextPiece[rowIndex][colIndex]
                                        : 0;

                                return (
                                    <div
                                        key={colIndex}
                                        className={`next-piece-cell ${cell > 0 ? 'filled' : ''}`}
                                        style={{
                                            backgroundColor: cell > 0 ? COLORS[cell] : 'transparent',
                                            borderColor: cell > 0 ? COLORS[cell] : '#e5e5e5',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    render() {
        const { score, level, linesCleared, gameOver, isPaused } = this.state;

        return (
            <div className={styles['tetris-container']}>
                <div className={styles['game-header']}>
                    <h1 className={styles['game-title']}>TETRIS</h1>
                    <div className={styles['game-stats']}>
                        <div className={styles.stat}>
                            <div className={styles['stat-label']}>SCORE</div>
                            <div className={styles['stat-value']}>{score}</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles['stat-label']}>LEVEL</div>
                            <div className={styles['stat-value']}>{level}</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles['stat-label']}>LINES</div>
                            <div className={styles['stat-value']}>{linesCleared}</div>
                        </div>
                    </div>
                </div>

                <div className={styles['game-content']}>
                    <div className={styles['game-main']}>
                        {this.renderBoard()}

                        {gameOver && (
                            <div className={styles['game-over']}>
                                <div className={styles['game-over-title']}>GAME OVER</div>
                                <div className={styles['game-over-score']}>Score: {score}</div>
                                <button onClick={this.resetGame} className="btn btn-primary">
                                    New Game
                                </button>
                            </div>
                        )}

                        {isPaused && (
                            <div className={styles['game-paused']}>
                                <div className={styles['game-paused-title']}>PAUSED</div>
                                <button onClick={this.togglePause} className="btn btn-primary">
                                    Resume
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={styles['game-side']}>
                        {this.renderNextPiece()}

                        <div className={styles.controls}>
                            <div className={styles['controls-title']}>CONTROLS</div>
                            <div className={styles['controls-grid']}>
                                <div className={styles['control-item']}>
                                    <div className={styles['control-key']}>{'<- ->'}</div>
                                    <div className={styles['control-action']}>Move</div>
                                </div>
                                <div className={styles['control-item']}>
                                    <div className={styles['control-key']}>↑</div>
                                    <div className={styles['control-action']}>Rotate</div>
                                </div>
                                <div className={styles['control-item']}>
                                    <div className={styles['control-key']}>↓</div>
                                    <div className={styles['control-action']}>Speed</div>
                                </div>
                                <div className={styles['control-item']}>
                                    <div className={styles['control-key']}>Space</div>
                                    <div className={styles['control-action']}>Drop</div>
                                </div>
                                <div className={styles['control-item']}>
                                    <div className={styles['control-key']}>P</div>
                                    <div className={styles['control-action']}>Pause</div>
                                </div>
                                <div className={styles['control-item']}>
                                    <div className={styles['control-key']}>R</div>
                                    <div className={styles['control-action']}>Reset</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles['game-actions']}>
                    <button onClick={this.resetGame} className="btn btn-secondary">
                        Reset
                    </button>
                    <button onClick={this.togglePause} className="btn btn-primary">
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                </div>
            </div>
        );
    }
}

export default Tetris;
