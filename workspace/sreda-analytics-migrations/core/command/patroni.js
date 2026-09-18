// sequelize db:migrate                        Run pending migrations
// sequelize db:migrate:schema:timestamps:add  Update migration table to have timestamps
// sequelize db:migrate:status                 List the status of all migrations
// sequelize db:migrate:undo                   Reverts a migration
// sequelize db:migrate:undo:all               Revert all migrations ran
// sequelize db:seed                           Run specified seeder
// sequelize db:seed:undo                      Deletes data from the database
// sequelize db:seed:all                       Run every seeder
// sequelize db:seed:undo:all                  Deletes data from the database
// sequelize db:create                         Create database specified by configuration
// sequelize db:drop                           Drop database specified by configuration
// sequelize init                              Initializes project
// sequelize init:config                       Initializes configuration
// sequelize init:migrations                   Initializes migrations
// sequelize init:models                       Initializes models
// sequelize init:seeders                      Initializes seeders
// sequelize migration:generate                Generates a new migration file      [aliases: migration:create]
// sequelize model:generate                    Generates a model and its migration [aliases: model:create]
// sequelize seed:generate                     Generates a new seed file           [aliases: seed:create]

// Перегрузка уровней логирования
require('../console');

// Загрузка зашифрованных переменных окружения
require('../crypto-env');

// Инициализация переменных окружения и установка значений по-умолчанию
require('../sreda-env');

const fs = require('fs');
const path = require('path');
const PatroniSwitcher = require('patroni-switcher');

const config = require('../db/config');
const connection = require('../db/connection');

const DB_DIR = path.resolve(sreda.env.VAR, sreda.env?.DB_DIR ?? 'db');

const MIGRATIONS_PATH = path.join(DB_DIR, 'migrations');
const SEEDERS_PATH = path.join(DB_DIR, 'seeders');

const db_migrate = async () => {
    const faf = fs.readdirSync(MIGRATIONS_PATH);

    let result = await connection.query(
        `SELECT * FROM ${config.schema}."SequelizeMeta"`,
        {
            raw: false,
        }
    );
    let loadedTables = result[0];
    loadedTables = loadedTables.map((value) => value.name);
    const migrationFiles = [];
    for (const table of faf) {
        if (loadedTables.indexOf(table) === -1) {
            migrationFiles.push(table);
        }
    }

    for (const migrationFile of migrationFiles) {
        const timework = Date.now();
        console.log(`== ${migrationFile}: migrating =======`);

        const filename = path.join(MIGRATIONS_PATH, migrationFile);
        const migrate = require(filename);

        try {
            const { queryInterface } = connection;
            await migrate.up(queryInterface, PatroniSwitcher);
            result = await connection.query(
                `INSERT INTO ${config.schema}."SequelizeMeta" VALUES ('${migrationFile}')`
            );
        } catch (e) {
            console.error(e);
        }

        console.log(
            `== ${migrationFile}: migrated (${Date.now() - timework}s)`
        );
    }
};

const db_migrate_undo_all = async () => {
    const faf = fs.readdirSync(path.join(DB_DIR, 'migrations'));

    let result = await connection.query(
        `SELECT * FROM ${config.schema}."SequelizeMeta"`,
        {
            raw: false,
        }
    );
    let loadedTables = result[0];
    loadedTables = loadedTables.map((value) => value.name);
    loadedTables.reverse();
    const migrationFiles = [];
    for (const table of loadedTables) {
        if (faf.indexOf(table) !== -1) {
            migrationFiles.push(table);
        }
    }

    for (const migrationFile of migrationFiles) {
        const timework = Date.now();
        console.log(`== ${migrationFile}: migrating =======`);

        const filename = path.join(MIGRATIONS_PATH, migrationFile);
        const migrate = require(filename);

        try {
            const { queryInterface } = connection;
            await migrate.down(queryInterface, PatroniSwitcher);
            result = await connection.query(
                `DELETE FROM ${config.schema}."SequelizeMeta" WHERE name='${migrationFile}'`
            );
        } catch (e) {
            console.error(e);
        }

        console.log(
            `== ${migrationFile}: migrated (${(Date.now() - timework) / 60}s)`
        );
    }
};

const db_seed_all = async () => {
    const seedersFiles = fs.readdirSync(SEEDERS_PATH);

    for (const seedersFile of seedersFiles) {
        const timework = Date.now();
        console.log(`== ${seedersFile}: seedering =======`);

        const filename = path.join(SEEDERS_PATH, seedersFile);
        const seed = require(filename);

        try {
            const { queryInterface } = connection;
            await seed.up(queryInterface, PatroniSwitcher);
        } catch (e) {
            console.error(e);
        }
        console.log(
            `== ${seedersFile}: seedered (${(Date.now() - timework) / 60}s)`
        );
    }
};

const db_seed_undo_all = async () => {
    const seedersFiles = fs.readdirSync(SEEDERS_PATH);
    seedersFiles.reverse();

    for (const seedersFile of seedersFiles) {
        const timework = Date.now();
        console.log(`== ${seedersFile}: seedering =======`);

        const filename = path.join(SEEDERS_PATH, seedersFile);
        const seed = require(filename);

        try {
            const { queryInterface } = connection;
            await seed.down(queryInterface, PatroniSwitcher);
        } catch (e) {
            console.error(e);
        }
        console.log(`== ${seedersFile}: seedered (${Date.now() - timework}s)`);
    }
};

const main = async () => {
    const beforeCreateSchema = process.env.DB_BEFORECREATESCHEMA ?? '';
    const afterCreateSchema = process.env.DB_AFTERCREATESCHEMA ?? '';
    // Создаем схему
    try {
        await connection.query(
            `${beforeCreateSchema} CREATE SCHEMA IF NOT EXISTS "${config.schema}"; ${afterCreateSchema}`,
            { raw: false }
        );
    } catch (e) {
        console.error(e);
    }
    // Создаем таблицу SequelizeMeta
    try {
        await connection.query(
            `CREATE TABLE IF NOT EXISTS ${config.schema}."SequelizeMeta" (name varchar(255) PRIMARY KEY UNIQUE)`,
            { raw: false }
        );
    } catch (e) {
        console.error(e);
    }

    // down
    if (~process.argv.indexOf('db:seed:undo:all')) await db_seed_undo_all();
    if (~process.argv.indexOf('db:migrate:undo:all'))
        await db_migrate_undo_all();

    // up
    if (~process.argv.indexOf('db:migrate')) await db_migrate();
    if (~process.argv.indexOf('db:seed:all')) await db_seed_all();
};

main()
    .then((value) => {
        console.log('End Work');
    })
    .catch((err) => {
        console.error(err);
    })
    .finally(() => process.exit());
