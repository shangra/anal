/*
Вот пример тестов для класса `ConnectorsService`, написанный с использованием библиотеки Jest:


Эти тесты покрывают основные методы класса `ConnectorsService`: создание форм, шифрование паролей, управление метаданными и тестирование соединений. Тесты используют мокирование зависимостей через `jest.mock()` и проверяют ожидаемое поведение методов.
*/

const ConnectorsService = require('../../services/Connectors.service');

describe('ConnectorsService', () => {
    let connectorsService;

    beforeEach(() => {
        connectorsService = new ConnectorsService();
    });

    describe('form', () => {
        it('should return correct form structure without ID', async () => {
            const result = await connectorsService.form();

            expect(result.form.length).toEqual(1); // Проверяет наличие формы
            expect(result.buttons.length).toEqual(0); // Без ID кнопки не должны присутствовать
        });

        it('should return correct form with button when ID is provided', async () => {
            const result = await connectorsService.form('some-id');

            expect(result.form.length).toEqual(1); // Форма должна существовать
            expect(result.buttons.length).toEqual(1); // Должна быть одна кнопка
            expect(result.buttons[0].name).toEqual('MetaConnectorTest'); // Проверка имени кнопки
        });
    });

    describe('crypto', () => {
        it('should encrypt a given text using AES-256-CBC encryption', async () => {
            const encryptedText = await connectorsService.crypto('sample-text');

            expect(typeof encryptedText).toEqual('string'); // Результат должен быть строкой
            expect(encryptedText).not.toEqual('sample-text'); // Шифрованный текст отличается от оригинального
        });
    });

    describe('metadataItem', () => {
        it('should clear password field from returned form', async () => {
            jest.spyOn(
                connectorsService,
                'super.metadataItem'
            ).mockResolvedValue({
                data: { password: 'secret' },
            });

            const result = await connectorsService.metadataItem('some-id');

            expect(result.data.password).toEqual('');
        });
    });

    describe('createMetadata', () => {
        it('should encrypt password and delegate creation to parent method', async () => {
            const body = { settings: { password: 'plain-password' } };

            jest.spyOn(
                connectorsService,
                'super.createMetadata'
            ).mockResolvedValue({
                success: true,
            });
            jest.spyOn(connectorsService, 'crypto').mockResolvedValue(
                'encrypted-password'
            );

            await connectorsService.createMetadata(body);

            expect(connectorsService.crypto).toHaveBeenCalledWith(
                'plain-password'
            );
            expect(connectorsService.super.createMetadata).toHaveBeenCalledWith(
                {
                    settings: { password: 'encrypted-password' },
                }
            );
        });
    });

    describe('updateMetadata', () => {
        it('should handle password updates correctly', async () => {
            const body = { settings: { password: 'new-pass' } };

            jest.spyOn(
                connectorsService,
                'super.metadataItem'
            ).mockResolvedValue({
                data: { password: 'old-pass' },
            });
            jest.spyOn(
                connectorsService,
                'super.updateMetadata'
            ).mockResolvedValue({
                success: true,
            });
            jest.spyOn(connectorsService, 'crypto').mockResolvedValue(
                'encrypted-new-pass'
            );

            await connectorsService.updateMetadata('some-id', body);

            expect(connectorsService.crypto).toHaveBeenCalledWith('new-pass');
            expect(connectorsService.super.updateMetadata).toHaveBeenCalledWith(
                'some-id',
                {
                    settings: { password: 'encrypted-new-pass' },
                }
            );
        });

        it('should retain old password if no new one is provided', async () => {
            const body = {};

            jest.spyOn(
                connectorsService,
                'super.metadataItem'
            ).mockResolvedValue({
                data: { password: 'old-pass' },
            });
            jest.spyOn(
                connectorsService,
                'super.updateMetadata'
            ).mockResolvedValue({
                success: true,
            });

            await connectorsService.updateMetadata('some-id', body);

            expect(connectorsService.super.updateMetadata).toHaveBeenCalledWith(
                'some-id',
                {
                    settings: { password: 'old-pass' },
                }
            );
        });
    });

    describe('patchMetadata', () => {
        it('should merge deep and update metadata', async () => {
            const body = { someKey: 'value' };

            jest.spyOn(connectorsService.Metadata, 'getItem').mockResolvedValue(
                {
                    manifest: { existingKey: 'val' },
                }
            );
            jest.spyOn(
                connectorsService,
                'super.updateMetadata'
            ).mockResolvedValue({
                success: true,
            });

            await connectorsService.patchMetadata('some-id', body);

            expect(connectorsService.super.updateMetadata).toHaveBeenCalledWith(
                'some-id',
                {
                    existingKey: 'val',
                    someKey: 'value',
                }
            );
        });
    });

    describe('test', () => {
        it('should return successful connection status on valid query', async () => {
            jest.spyOn(
                ConnectorClass.prototype,
                'getConnector'
            ).mockReturnValue({
                connector: { querySql: jest.fn() },
            });

            const response = await connectorsService.test('valid-connector-id');

            expect(response.result).toEqual(true);
        });

        it('should return failed connection status on invalid query', async () => {
            jest.spyOn(
                ConnectorClass.prototype,
                'getConnector'
            ).mockReturnValue({
                connector: {
                    querySql: jest.fn().mockRejectedValue(new Error()),
                },
            });

            const response = await connectorsService.test(
                'invalid-connector-id'
            );

            expect(response.result).toEqual(false);
        });
    });
});
