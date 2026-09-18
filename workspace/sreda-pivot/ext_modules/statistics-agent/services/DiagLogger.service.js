const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { DIAG_LOG_LEVEL } = require('../src/constants');

/**
 * Сервис инициализации OpenTelemetry diag логгера
 * Логирование переключается через переменную окружения STATISTICS_LOG_LEVEL
 * Значение: 0 - выключено, 1-5 - уровни логирования (см. DIAG_LOG_LEVEL)
 */
class DiagLoggerService {
    /**
     * Метод инициализации diag логгера
     * @returns {boolean} true если логгер был успешно инициализирован, false - если отключен
     */
    init() {
        // Получаем уровень логирования из env (1-я цифра от 0)
        const diagLogLevelEnv = sreda.env.STATISTICS_LOG_LEVEL;

        // Если переменная не задана или равна 0, логирование отключено
        if (!diagLogLevelEnv || diagLogLevelEnv === 0) {
            return false;
        }

        // Определяем соответствующий уровень DiagLogLevel
        let diagLogLevel;
        switch (diagLogLevelEnv) {
            case DIAG_LOG_LEVEL.ERROR:
                diagLogLevel = DiagLogLevel.ERROR;
                break;
            case DIAG_LOG_LEVEL.WARN:
                diagLogLevel = DiagLogLevel.WARN;
                break;
            case DIAG_LOG_LEVEL.INFO:
                diagLogLevel = DiagLogLevel.INFO;
                break;
            case DIAG_LOG_LEVEL.DEBUG:
                diagLogLevel = DiagLogLevel.DEBUG;
                break;
            case DIAG_LOG_LEVEL.VERBOSE:
                diagLogLevel = DiagLogLevel.VERBOSE;
                break;
            default:
                // Если указан некорректный уровень, отключаем логирование
                return false;
        }

        // Включаем логгер ДО ВСЕХ остальных действий
        diag.setLogger(new DiagConsoleLogger(), diagLogLevel);

        return true;
    }
}

module.exports = new DiagLoggerService();
