'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const readline = require('readline/promises');

const DB_KEYS = ['DB_HOST', 'DB_DATABASE', 'DB_USER', 'DB_PASS'];

/** Список каталогов сервисов из workspaces корневого package.json */
function listWorkspaces(rootDir) {
    const pkg = require(path.join(rootDir, 'package.json'));
    const dirs = [];
    for (const pattern of pkg.workspaces || []) {
        const parts = String(pattern).split('/');
        if (parts[parts.length - 1] !== '*') {
            const dir = path.join(rootDir, ...parts);
            if (fs.existsSync(path.join(dir, 'package.json'))) dirs.push(dir);
            continue;
        }
        const baseDir = path.join(rootDir, ...parts.slice(0, -1));
        if (!fs.existsSync(baseDir)) continue;
        for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const dir = path.join(baseDir, entry.name);
            if (fs.existsSync(path.join(dir, 'package.json'))) dirs.push(dir);
        }
    }
    return dirs;
}

/** Разбор текста .env в объект (комментарии и пустые строки игнорируются) */
function parseEnv(text) {
    const env = {};
    for (const line of String(text).split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
        if (match) env[match[1]] = match[2].trim();
    }
    return env;
}

/** Возвращает текст .env с заменёнными/добавленными значениями, остальное содержимое сохраняется */
function serializeEnv(text, updates) {
    const lines = String(text).split(/\r?\n/);
    const handled = new Set();
    const result = lines.map((line) => {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (match && Object.prototype.hasOwnProperty.call(updates, match[1])) {
            handled.add(match[1]);
            return `${match[1]}=${updates[match[1]]}`;
        }
        return line;
    });
    for (const [key, value] of Object.entries(updates)) {
        if (!handled.has(key)) {
            if (result.length > 0 && result[result.length - 1].trim() !== '') result.push('');
            result.push(`${key}=${value}`);
        }
    }
    return result.join('\n');
}

/** Читает корневой .env; если файла нет — пустой объект */
function readRootEnv(rootDir) {
    const envPath = path.join(rootDir, '.env');
    if (!fs.existsSync(envPath)) return {};
    return parseEnv(fs.readFileSync(envPath, 'utf8'));
}

/** Записывает значения в корневой .env, создавая файл при необходимости */
function writeRootEnv(rootDir, updates) {
    const envPath = path.join(rootDir, '.env');
    const text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    fs.writeFileSync(envPath, serializeEnv(text, updates));
}

/** Интерактивный вопрос пользователю; пустой ответ переспрашивается, пока не пройдёт валидация */
function openPrompt() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return {
        async ask(question, validate) {
            for (;;) {
                const answer = (await rl.question(question)).trim();
                if (!validate || validate(answer)) return answer;
                console.log('Некорректное значение, попробуйте ещё раз.');
            }
        },
        close() {
            rl.close();
        },
    };
}

/** Запуск npm через node и npm-cli.js, без команды npm в PATH. */
function npmExec(args) {
    const nodeDir = path.dirname(process.execPath);
    const candidates = [
        path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        path.join(nodeDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    ];
    const cli = candidates.find((item) => fs.existsSync(item));
    if (!cli) {
        throw new Error(`Не найден npm-cli.js рядом с node (${process.execPath})`);
    }
    return { command: process.execPath, args: [cli, ...args], shell: false };
}

function runNpm(args, options = {}) {
    const exec = npmExec(args);
    return spawnSync(exec.command, exec.args, {
        stdio: 'inherit',
        shell: exec.shell,
        ...options,
    });
}

function spawnNpm(args, options = {}) {
    const exec = npmExec(args);
    return spawn(exec.command, exec.args, {
        shell: exec.shell,
        ...options,
    });
}

function loadServiceCommands(rootDir) {
    const file = path.join(rootDir, 'box.commands.json');
    if (!fs.existsSync(file)) return {};
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.services || {};
}

function splitCommand(command) {
    const parts = [];
    const pattern = /"([^"]*)"|'([^']*)'|\S+/g;
    let match = pattern.exec(command);
    while (match) {
        parts.push(match[1] ?? match[2] ?? match[0]);
        match = pattern.exec(command);
    }
    return parts;
}

function commandSteps(command) {
    return String(command)
        .split(/\s*&&\s*/)
        .map((step) => step.trim())
        .filter(Boolean);
}

function cleanDirs(cwd, names) {
    for (const name of names || []) {
        const rel = String(name);
        if (!rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) {
            throw new Error(`Недопустимый каталог для очистки: ${rel}`);
        }
        fs.rmSync(path.resolve(cwd, rel), { recursive: true, force: true });
    }
}

function serviceEnv(baseEnv, spec) {
    return { ...(baseEnv || process.env), ...(spec && spec.env) };
}

function runOne(command, options = {}) {
    const parts = splitCommand(command);
    if (parts[0] === 'node') {
        return spawnSync(process.execPath, parts.slice(1), {
            cwd: options.cwd,
            env: options.env || process.env,
            stdio: 'inherit',
        });
    }
    if (parts[0] === 'npm') {
        return runNpm(parts.slice(1), options);
    }
    throw new Error(`Неизвестная команда: ${command}`);
}

function spawnOne(command, options = {}) {
    const parts = splitCommand(command);
    if (parts[0] === 'node') {
        return spawn(process.execPath, parts.slice(1), {
            cwd: options.cwd,
            env: options.env || process.env,
        });
    }
    if (parts[0] === 'npm') {
        return spawnNpm(parts.slice(1), options);
    }
    throw new Error(`Неизвестная команда: ${command}`);
}

function runConfigured(command, options = {}) {
    let result = { status: 0 };
    for (const step of commandSteps(command)) {
        result = runOne(step, options);
        if (result.status !== 0) return result;
    }
    return result;
}

function spawnConfigured(command, options = {}) {
    const steps = commandSteps(command);
    const last = steps.pop();
    for (const step of steps) {
        const result = runOne(step, options);
        if (result.status !== 0) {
            const { EventEmitter } = require('events');
            const child = new EventEmitter();
            child.stdout = null;
            child.stderr = null;
            child.kill = () => {};
            process.nextTick(() => {
                child.emit('exit', result.status, null);
            });
            return child;
        }
    }
    return spawnOne(last, options);
}

module.exports = {
    DB_KEYS,
    listWorkspaces,
    parseEnv,
    serializeEnv,
    readRootEnv,
    writeRootEnv,
    openPrompt,
    runNpm,
    spawnNpm,
    loadServiceCommands,
    serviceEnv,
    runConfigured,
    spawnConfigured,
    cleanDirs,
};
