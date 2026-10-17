const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const workflow = yaml.load(fs.readFileSync(path.resolve(__dirname, '../../../.github/workflows/test.yml'), 'utf8'));
const job = workflow.jobs['test-live-metadata-integration'];
describe('追加情報CIの隔離方針', () => {
    it('同期保護の仮baseでもPR検証を継続し、push対象はmain/devから広げない', () => {
        expect(workflow.on.pull_request.branches).toEqual(['main', 'dev', 'hayaryoo519/fix-issue196-sync-guards']);
        expect(workflow.on.push.branches).toEqual(['main', 'dev']);
    });
    it('GitHub-hosted runner/読み取り権限/明示PG16だけで動かし、秘密情報を参照しない', () => {
        expect(job['runs-on']).toBe('ubuntu-24.04');
        expect(job.permissions).toEqual({ contents: 'read' });
        expect(job.env).toEqual({ APP_ENV: 'test', PG_BIN: '/usr/lib/postgresql/16/bin' });
        expect(JSON.stringify(job)).not.toMatch(/secrets\.|DB_HOST|DB_PASSWORD|sync-db|scripts\/migrate/);
        expect(job.steps[0].with['persist-credentials']).toBe(false);
    });
    it('合成/旧schema/Worker/本番生成物を検証し、成果物は合成API reportだけに限定する', () => {
        const commands = job.steps.map(step => step.run || '').join('\n');
        expect(commands).toContain('npm run test:e2e:metadata');
        expect(commands).toContain('npm run test:metadata-db --prefix server\n');
        expect(commands).toContain('-- --worker --built-worker');
        const uploads = job.steps.filter(step => step.uses?.startsWith('actions/upload-artifact'));
        expect(uploads).toHaveLength(1);
        expect(uploads[0].if).toBe('failure()');
        expect(uploads[0].with.path.trim().split('\n')).toEqual(['playwright-report/metadata/', 'test-results/metadata/']);
        expect(uploads[0].with['retention-days']).toBe(3);
    });
});
