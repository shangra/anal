// Для некоторых фич с консольным выводом

/**
 * Для даты и времени в начале строки
 */
// process.on('uncaughtException', console.error);

const prefix = (type) =>
    process.env.LOG_PREFIX === 'true'
        ? new Date().toISOString() + ' | ' + type + ' | '
        : '';

const write =
    (std, type) =>
    (...args) =>
        std.apply(null, [prefix(type) + args[0], args[1], args[2]]);

const processStderr = process.stderr.write.bind(process.stderr);
process.stderr.write = write(processStderr, 'ERRR');

const processStdout = process.stdout.write.bind(process.stdout);
process.stdout.write = write(processStdout, 'INFO');

/**
 * Для разделения логирования на разные уровни (отключение лишних логов)
 */
class LogLevels {}
LogLevels.DEBUG = 0;
LogLevels.INFO = 1;
LogLevels.WARN = 2;
LogLevels.ERROR = 3;

const level = +(process.env.LOG_LEVEL ?? 1);

const debug = console.debug.bind(console);
console.debug = (...args) => LogLevels.DEBUG >= level && debug(...args);

const log = console.log.bind(console);
console.log = (...args) => LogLevels.INFO >= level && log(...args);

const info = console.info.bind(console);
console.info = (...args) => LogLevels.INFO >= level && info(...args);

const warn = console.warn.bind(console);
console.warn = (...args) => LogLevels.WARN >= level && warn(...args);

const error = console.error.bind(console);
console.error = (...args) => LogLevels.ERROR >= level && error(...args);

const trace = console.trace.bind(console);
console.trace = (...args) => LogLevels.ERROR >= level && trace(...args);

module.exports = {};
