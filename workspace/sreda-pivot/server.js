const cluster = require('cluster');
const http = require('http');
const https = require('https');
const timers = require('node:timers/promises');
const { readFileSync } = require('fs');

require('./core');

// временное решение с общим хранилищем в памяти кластера для всех воркеров
// удалить после подключение удаленного in memory хранилища
const {
    CLUSTER_MSG_MEMORY_OPERATION,
    CLUSTER_MSG_MEMORY_OPERATION_RESULT,
} = require('./core/src/constants');
const MemorySave = require('./core/services/memory-save');

//----------------------------------------------------------------------------------------------
const gracefulShutDown = async (server, timeout) => {
    // прекращаем прием новых соединений
    console.log(`Worker ${process.pid} GRACEFULL SHUTDOWN`);
    server.close((error) => {
        if (error) {
            console.error(error);
            process.exit(1);
        }
    });
    // закрываем существующие соединения по истечению таймера
    await timers.setTimeout(timeout);
    // eslint-disable-next-line no-restricted-syntax
    for (const [socket, res] of sreda.server.connections.entries() ?? []) {
        sreda.server.connections.delete(socket);
        res.end('Сервис не доступен');
        socket.destroy();
    }
};
//----------------------------------------------------------------------------------------------

const SIGINT = 'SIGINT';

const CLUSTER_WORKERS_COUNT = Number(process.env.CLUSTER_WORKERS_COUNT) || 1;

if (cluster.isMaster && CLUSTER_WORKERS_COUNT > 1) {
    for (let i = 0; i < CLUSTER_WORKERS_COUNT; i++) {
        cluster.fork();
    }

    cluster.on('fork', (worker) => {
        worker.on('message', async (message) => {
            // если в один из воркеров пришел SIGINT, он оповещает кластер и выключаются все остальные воркеры
            const { msg } = message;
            if (msg === SIGINT) {
                Object.entries(cluster.workers)
                    .filter(([id]) => Number(id) !== worker.id)
                    .forEach(([, w]) => w.send({ msg: SIGINT }));
            } else if (msg === CLUSTER_MSG_MEMORY_OPERATION) {
                const {
                    data: { args, operation, operationId },
                } = message;
                try {
                    const result = await MemorySave[operation](...args);
                    worker.send({
                        msg: CLUSTER_MSG_MEMORY_OPERATION_RESULT,
                        operationId,
                        result,
                        isSucceed: true,
                    });
                } catch (e) {
                    console.error(e);
                    worker.send({
                        msg: CLUSTER_MSG_MEMORY_OPERATION_RESULT,
                        operationId,
                        result: e,
                        isSucceed: false,
                    });
                }
            }
        });
        worker.on('error', console.error);
        worker.on('disconnect', (worker) => cluster.fork());
        worker.on('exit', (code, signal) =>
            console.warn(
                `Worker ${worker.id} (PID: ${worker.process?.pid}) exited with code ${code} (${signal}). Restarting worker...`
            )
        );
    });
} else {
    // хранилище соединений
    sreda.server = { connections: new Map() };

    const connectionHandler = async (req, res) => {
        // добавляем соединение в хранилище
        const { socket } = res;
        sreda.server.connections.set(socket, res);
        // удаляем соединение из хранилища, после завершения сеанса
        if (socket) {
            socket.once('close', () => {
                sreda.server.connections.delete(socket);
            });
        }

        // подключаем ресты
        sreda.restmodule.start(req, res);
    };

    let server;
    const {
        CHECK_CERT,
        SERVER_KEY,
        SERVER_CERT,
        SERVER_CA,
        REJECT_UNAUTH = false,
        SHUTDOWN_TIMEOUT = 2000,
        PORT = 3080,
    } = process.env;
    const isHttps =
        CHECK_CERT === 'true' &&
        SERVER_KEY !== undefined &&
        SERVER_CERT !== undefined &&
        SERVER_CA !== undefined;

    if (isHttps) {
        const options = {
            key: readFileSync(SERVER_KEY),
            cert: readFileSync(SERVER_CERT),
            ca: readFileSync(SERVER_CA),
            requestCert: true,
            rejectUnauthorized: REJECT_UNAUTH === 'true',
        };
        server = https.createServer(options, connectionHandler);
    } else {
        server = http.createServer(connectionHandler);
    }

    server.keepAliveTimeout = sreda.env?.KEEP_ALIVE ?? 60_000; // Default 1 minute
    server.headersTimeout = sreda.env?.HEADERS_TIMEOUT ?? 61_000; // Default 1 minute 1 second

    server.listen(PORT, () => {
        console.log(
            `${isHttps ? 'Https' : 'Http'} server started on port: ${PORT}`
        );

        if (cluster.isWorker) {
            process.on(SIGINT, async () => {
                // отправляем сообщение в кластер о получении команды выключения
                process.send({ msg: SIGINT });
                await gracefulShutDown(server, SHUTDOWN_TIMEOUT);
                process.exit(0);
            });
            process.on('message', async ({ msg }) => {
                // программный SIGINT из кластера
                if (msg === SIGINT) {
                    await gracefulShutDown(server, SHUTDOWN_TIMEOUT);
                    process.exit(0);
                }
            });
        }
    });
    console.debug(`Worker ${process.pid} started`);
}

// общие обработчики для кластера и воркеров

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION at:', reason);
});
