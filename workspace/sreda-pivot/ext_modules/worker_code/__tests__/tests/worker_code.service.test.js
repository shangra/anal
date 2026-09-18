/*
Вот пример тестов для класса `worker_codeService`, использующий библиотеку Jest:


Эти тесты проверяют основные сценарии поведения методов `run()` и `start()` класса `worker_codeService`: успешное выполнение задач, обработку ошибок и реакцию на завершение воркера с ненулевым статусом завершения.
*/

const worker_codeService = require('./worker_code.service');
const { Worker } = require('node:worker_threads');
jest.mock('node:worker_threads');

describe('worker_codeService', () => {
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('run method', () => {
        
        test('should successfully execute a task and return resolved promise', async () => {
            const mockResult = { message: 'Task completed' };
            
            Worker.mockImplementationOnce(() => ({
                on(eventName, callback) {
                    switch (eventName) {
                        case 'message':
                            setTimeout(() => callback(mockResult), 10); break;
                        default:
                            break;
                    }
                },
                terminate: jest.fn()
            }));

            const service = new worker_codeService('someFile.js');
            const result = await service.run('funcName', ['arg1']);

            expect(result).toEqual(mockResult);
        });

        test('should handle errors from workers correctly', async () => {
            const errorMessage = 'Error occurred during execution';

            Worker.mockImplementationOnce(() => ({
                on(eventName, callback) {
                    switch (eventName) {
                        case 'message':
                            setTimeout(() => callback({ error: new Error(errorMessage) }), 10); break;
                        default:
                            break;
                    }
                },
                terminate: jest.fn()
            }));

            const service = new worker_codeService('someFile.js');

            await expect(service.run('funcName', ['arg1'])).rejects.toThrow(errorMessage);
        });

        test('should handle non-zero exit codes as rejections', async () => {
            Worker.mockImplementationOnce(() => ({
                on(eventName, callback) {
                    switch (eventName) {
                        case 'exit': 
                            setTimeout(() => callback(1), 10); break; // Non-zero exit code
                        default:
                            break;
                    }
                },
                terminate: jest.fn()
            }));

            const service = new worker_codeService('someFile.js');

            await expect(service.run('funcName')).rejects.toThrow('Worker stopped with exit code 1');
        });
    });

    describe('start method', () => {
        
        test('should successfully evaluate provided code and return resolved promise', async () => {
            const mockResult = { message: 'Evaluation complete' };

            Worker.mockImplementationOnce(() => ({
                on(eventName, callback) {
                    switch (eventName) {
                        case 'message':
                            setTimeout(() => callback(mockResult), 10); break;
                        default:
                            break;
                    }
                },
                terminate: jest.fn()
            }));

            const service = new worker_codeService('someFile.js');
            const result = await service.start('console.log("Hello World");');

            expect(result).toEqual(mockResult);
        });

        test('should handle evaluation errors properly', async () => {
            const errorMessage = 'Evaluation failed';

            Worker.mockImplementationOnce(() => ({
                on(eventName, callback) {
                    switch (eventName) {
                        case 'message':
                            setTimeout(() => callback({ error: new Error(errorMessage) }), 10); break;
                        default:
                            break;
                    }
                },
                terminate: jest.fn()
            }));

            const service = new worker_codeService('someFile.js');

            await expect(service.start('invalid code')).rejects.toThrow(errorMessage);
        });

        test('should handle non-zero exit codes for evaluated code', async () => {
            Worker.mockImplementationOnce(() => ({
                on(eventName, callback) {
                    switch (eventName) {
                        case 'exit': 
                            setTimeout(() => callback(1), 10); break; // Non-zero exit code
                        default:
                            break;
                    }
                },
                terminate: jest.fn()
            }));

            const service = new worker_codeService('someFile.js');

            await expect(service.start('some code')).rejects.toThrow('Worker stopped with exit code 1');
        });
    });
});
