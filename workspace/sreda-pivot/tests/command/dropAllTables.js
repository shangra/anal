// Перегрузка уровней логирования
require('../../core/console');

// Загрузка зашифрованных переменных окружения
require('../../core/crypto-env');

// Инициализация переменных окружения и установка значений по-умолчанию
require('../../core/sreda-env');

const connection = require('../../core/db/connection');

(async function () {
    console.log('--------------------');
    console.log('NODE_ENV = ', process.env.NODE_ENV);
    console.log('DB_TEST_DATABASE = ', process.env.DB_TEST_DATABASE);
    console.log('--------------------');
    if (process.env.NODE_ENV !== 'test') {
        console.log('Not "test" env, script aborted');
        return;
    }
    const sql = `
    DO
$$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (SELECT * FROM information_schema.tables where table_schema = '${process.env.DB_SCHEMA}')
            LOOP
                IF r.table_type = 'BASE TABLE' THEN
                    EXECUTE 'DROP TABLE' || ' ' || '${process.env.DB_SCHEMA}.' || quote_ident(r.table_name) || ' ' || 'CASCADE';
                END IF;
            END LOOP;
    END
$$;`;
    await connection.query(sql);
})();
