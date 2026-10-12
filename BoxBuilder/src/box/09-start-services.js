'use strict';

const path = require('path');
const { listWorkspaces, loadServiceCommands, serviceEnv, runConfigured, spawnConfigured, cleanDirs, readRootEnv } = require('./_utils');

/** Построчный вывод потока процесса с префиксом имени сервиса */
function pipeWithPrefix(stream, prefix, target) {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) target.write(`${prefix}${line}\n`);
    });
    stream.on('end', () => {
        if (buffer) target.write(`${prefix}${buffer}\n`);
    });
}

/** Этап 9. Запуск всех сервисов из workspaces и ожидание прерывания пользователем (Ctrl+C) */
async function startServices(ctx) {
    const commands = loadServiceCommands(ctx.rootDir);
    const services = listWorkspaces(ctx.rootDir).filter((dir) => {
        const spec = commands[path.basename(dir)];
        if (spec && spec.start) return true;
        const pkg = require(path.join(dir, 'package.json'));
        return Boolean(pkg.scripts && pkg.scripts.start);
    });

    if (services.length === 0) {
        console.log('Не найдены сервисы со скриптом "start".');
        return;
    }

    console.log(`Запуск сервисов (${services.length}): ${services.map((dir) => path.basename(dir)).join(', ')}`);
    console.log('Для остановки нажмите Ctrl+C\n');

    const children = new Map();
    let stopping = false;

    const shutdown = (signal) => {
        if (stopping) return;
        stopping = true;
        console.log(`\nПолучен сигнал ${signal}, останавливаем сервисы...`);
        for (const child of children.values()) {
            try {
                child.kill(signal);
            } catch {
                // процесс мог завершиться самостоятельно
            }
        }
        // страховка: если процессы не завершились, завершаем принудительно
        setTimeout(() => {
            for (const child of children.values()) {
                try {
                    child.kill('SIGKILL');
                } catch {
                    // игнорируем
                }
            }
            process.exit(0);
        }, 3000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    for (const dir of services) {
        const name = path.basename(dir);
        const spec = commands[name] || {};
        const env = serviceEnv(process.env, spec, readRootEnv(ctx.rootDir));
        if (spec.clean && spec.clean.length) {
            console.log(`[${name}] очистка: ${spec.clean.join(', ')}`);
            cleanDirs(dir, spec.clean);
        }
        if (spec.prepare) {
            console.log(`[${name}] подготовка: ${spec.prepare}`);
            const prepared = runConfigured(spec.prepare, { cwd: dir, env });
            if (prepared.status !== 0) {
                console.error(`[${name}] подготовка завершилась с кодом ${prepared.status}`);
                continue;
            }
        }
        const start = spec.start || 'npm run start';
        console.log(`[${name}] запуск: ${start}`);
        const child = spawnConfigured(start, { cwd: dir, env });
        children.set(name, child);
        child.on('error', (error) => {
            children.delete(name);
            console.error(`[${name}] не удалось запустить: ${error.message}`);
        });

        if (child.stdout) pipeWithPrefix(child.stdout, `[${name}] `, process.stdout);
        if (child.stderr) pipeWithPrefix(child.stderr, `[${name}] `, process.stderr);

        child.on('exit', (code, signal) => {
            children.delete(name);
            console.log(`[${name}] процесс завершён (code=${code}${signal ? ` signal=${signal}` : ''})`);
            if (!stopping && children.size === 0) {
                console.log('Все сервисы остановлены.');
                process.exitCode = code === null ? 0 : code;
            }
        });
    }

    console.log('Все сервисы запущены.');
}

module.exports = startServices;
module.exports.title = 'Запуск сервисов';
// Этап не выполняется автоматически при npm run setup, только вручную: npm run box
module.exports.runOnSetup = false;

// Возможность запуска файла напрямую: npm run box
if (require.main === module) {
    startServices({ rootDir: path.join(__dirname, '..'), state: {} }).catch((error) => {
        console.error('Ошибка:', error.message || error);
        process.exit(1);
    });
}
