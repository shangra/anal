const cp = require('child_process');
const readline = require('readline');

class LitePgNativeNew {
    constructor(connectionString) {
        this.cmd = 'psql';
        this.arg = connectionString;
    }

    parseRECORDS2(arr) {
        const res = [];

        let index = null;
        let obj = {};
        for (let i = 0; i < arr.length; i++) {
            const row = arr[i];

            if (row.startsWith('-[ RECORD ')) {
                res[index] = obj;

                obj = {};

                index = parseFloat(row.replace('-[ RECORD ', ''));

                continue;
            }

            const [key, val] = row.split(' | ');

            if (typeof val === 'undefined') {
                continue;
            }

            obj[key.trim()] = val?.trimRight() === '<--NULL-->' ? null : val?.trimRight();
        }

        if (Object.keys(obj).length) {
            res[index] = obj;
        }

        return res.slice(1);
    }

    async psql(stdin) {
        const lines = [];
        const err = [];

        await new Promise((resolve, reject) => {
            let child = cp.spawn(this.cmd, [this.arg]);
            const rl = readline.createInterface({ input: child.stdout });
            rl.on('line', (line) => lines.push(line));

            rl.on('close', () => resolve())

            child.stdin.write(stdin);

            child.stderr.on('data', (data) => err.push(data.toString()));
        });

        if (err.length) {
            throw new Error(err.join('\n'));
        }

        return this.parseRECORDS2(lines);
    }

    async query(SQL) {
        const stdin = `
\\x
\\pset null '<--NULL-->'
        ${SQL}
\\q
EOF`;

        const result = await this.psql(stdin);

        const fields = Object.keys(result?.[0] ?? {}).map(name => ({ name }));

        return [result, { fields }];
    }

    async deleteQuery(SQL) {
        //
    }

    async insertQuery(SQL) {
        //
    }

    /*
    *
psql -o test.txt postgres://postgres:4145@127.0.0.1:5432/psi_test<<EOF
\pset null '<null>'
SELECT * FROM backend."Tasks" LIMIT 5;
EOF
    * */
}

module.exports = LitePgNativeNew;
