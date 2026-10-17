// PostgreSQLクライアントは全て偽物。実DB/バックアップ/親プロセスの接続資格情報を使わない。
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const shellPath = value => value.replace(/\\/g, '/').replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
let temp;
let bin;
let log;
let backup;
beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uver-sync-mock-'));
    bin = path.join(temp, 'bin'); fs.mkdirSync(bin);
    log = path.join(temp, 'commands.log'); backup = path.join(temp, 'fixture.dump.gz');
    fs.writeFileSync(backup, 'SYNTHETIC ARCHIVE ONLY');
    const bodies = {
        dropdb: 'if [[ "$*" == *"--force"* ]]; then exit "${CLEANUP_FAIL:-0}"; fi; exit "${DROP_FAIL:-0}"',
        createdb: 'exit "${CREATE_FAIL:-0}"',
        zcat: 'printf "synthetic input"; exit "${DECOMPRESS_FAIL:-0}"',
        pg_restore: 'while IFS= read -r line; do :; done; if [ "${RESTORE_SIGNAL:-0}" = 1 ]; then kill -TERM "$PPID"; fi; exit "${RESTORE_FAIL:-0}"',
        psql: 'printf "target_override_state %s:%s:%s\\n" "${PGSERVICE+set}" "${PGSERVICEFILE+set}" "${PGHOSTADDR+set}" >> "$TEST_COMMAND_LOG"; for arg in "$@"; do if [[ "$arg" == --file=* ]]; then file="${arg#--file=}"; fi; done; grep -q public_live_tags "$file" && printf "sql_includes_metadata yes\\n" >> "$TEST_COMMAND_LOG"; if [ "${SQL_SIGNAL:-0}" = 1 ]; then kill -TERM "$PPID"; fi; exit "${SQL_FAIL:-0}"',
    };
    for (const [name, body] of Object.entries(bodies)) {
        const file = path.join(bin, name);
        fs.writeFileSync(file, `#!/bin/bash\nprintf '${name} %s\\n' "$*" >> "$TEST_COMMAND_LOG"\n${body}\n`);
        fs.chmodSync(file, 0o755);
    }
});
afterEach(() => fs.rmSync(temp, { recursive: true, force: true }));
function run(extra = {}) {
    // 内側PATHに実PostgreSQLクライアントのフォルダーを含めない。
    const result = spawnSync('bash', ['-c', 'export PATH="$1:/usr/bin:/bin"; exec bash "$2" "$3"', 'sync-fixture', shellPath(bin), shellPath(path.join(root, 'scripts/sync-db.sh')), shellPath(backup)], {
        env: {
            PATH: process.env.PATH,
            ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
            APP_ENV: 'staging', PGHOST: '127.0.0.1', PGPORT: '65432', STAGING_DB_NAME: 'uver_setlist_staging',
            STAGING_OFFLINE_ACK: '1', TEST_COMMAND_LOG: shellPath(log), ...extra,
        }, encoding: 'utf8', timeout: 15000,
    });
    if (result.error) throw result.error;
    return { ...result, commands: fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [] };
}
describe('検証DB同期の失敗時保護', () => {
    it('匿名化をpsqlrcなし/エラー停止/単一トランザクションで実行する', () => {
        const result = run();
        expect(result.status).toBe(0);
        expect(result.commands.filter(command => command.startsWith('dropdb'))).toHaveLength(1);
        expect(result.commands.find(command => command.startsWith('psql'))).toContain('-X --set=ON_ERROR_STOP=1 --single-transaction');
        expect(result.commands).toContain('sql_includes_metadata yes');
        expect(result.commands.find(command => command.startsWith('pg_restore'))).toContain('--exit-on-error --no-owner --no-privileges --file=-');
        expect(result.stdout).toContain('successfully completed');
    });
    it('公開/ワーカー停止の確認なしではDB変更しない', () => {
        const result = run({ STAGING_OFFLINE_ACK: '' });
        expect(result.status).not.toBe(0); expect(result.commands).toEqual([]);
    });
    it.each(['postgresql://example.invalid/prod', 'host=example.invalid dbname=prod', '--help', 'db with spaces', 'db;DROP'])('DB名に接続文字列/オプションを使えない %s', name => {
        const result = run({ STAGING_DB_NAME: name });
        expect(result.status).not.toBe(0); expect(result.commands).toEqual([]);
    });
    it.each([{ PGHOST: '' }, { PGHOST: 'localhost,example.invalid' }, { PGPORT: '' }, { PGPORT: '65536' }])('接続先を明示せずに実行しない %j', target => {
        const result = run(target);
        expect(result.status).not.toBe(0); expect(result.commands).toEqual([]);
    });
    it('隠れたlibpq接続先の上書きを無効化する', () => {
        const result = run({ PGSERVICE: 'fixture-service', PGSERVICEFILE: 'fixture-service-file', PGHOSTADDR: 'example.invalid' });
        expect(result.status).toBe(0);
        expect(result.commands).toContain('target_override_state ::');
    });
    it('本番環境では停止確認があっても実行しない', () => {
        const result = run({ APP_ENV: 'production' });
        expect(result.status).not.toBe(0); expect(result.commands).toEqual([]);
    });
    it.each(['SQL_FAIL', 'RESTORE_FAIL', 'DECOMPRESS_FAIL'])('%sで成功と報告せず生成失敗時は既存DBを維持する', flag => {
        const result = run({ [flag]: '1' });
        expect(result.status).not.toBe(0);
        expect(result.commands.filter(command => command.startsWith('dropdb'))).toEqual(flag === 'SQL_FAIL' ? [
            'dropdb --if-exists uver_setlist_staging', 'dropdb --if-exists --force uver_setlist_staging',
        ] : []);
        expect(result.stdout).not.toContain('successfully completed');
        if (flag !== 'SQL_FAIL') expect(result.commands.some(command => command.startsWith('psql'))).toBe(false);
    });
    it.each(['DROP_FAIL', 'CREATE_FAIL'])('%sで生成済みSQLをDBへ実行しない', flag => {
        const result = run({ [flag]: '1' });
        expect(result.status).not.toBe(0);
        expect(result.commands.some(command => command.startsWith('psql'))).toBe(false);
    });
    it('シグナルでも匿名化前DBを安全側へ削除する', () => {
        const result = run({ SQL_SIGNAL: '1' });
        expect(result.status).not.toBe(0);
        expect(result.commands).toContain('dropdb --if-exists --force uver_setlist_staging');
        expect(result.stdout).not.toContain('successfully completed');
    });
    it('安全削除も失敗したら生データ残存の可能性と公開停止継続を警告する', () => {
        const result = run({ SQL_FAIL: '1', CLEANUP_FAIL: '1' });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('SAFETY CLEANUP FAILED');
        expect(result.stderr).toContain('Keep Staging offline');
    });
});
