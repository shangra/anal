// Перегрузка уровней логирования
require('./console');

// Загрузка зашифрованных переменных окружения
require('./crypto-env');

// Инициализация переменных окружения и установка значений по-умолчанию
require('./sreda-env');

require('./resources-monitor');

// Заглушка RPC на случай отсутствующего модуля
require('./wrapper');

// Инициализируем модули ядра платформы
require('../ext_modules');

// Загружаем модели
try {
    require('./db/models');
} catch (e) {
    console.warn('Не удалось загрузить модели.', e.message);
}

// Загружаем хуки
require('./hooks');

// Загружаем ресты
require('./app');

module.exports = {};
