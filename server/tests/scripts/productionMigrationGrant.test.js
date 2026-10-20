const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const workflow = yaml.load(fs.readFileSync(path.resolve(__dirname, '../../../.github/workflows/deploy-production.yml'), 'utf8'));
const script = workflow.jobs.deploy.steps.find(step => step.name === 'Deploy to Production Server')?.run;

describe('Production migration privilege guard', () => {
    it('runs only for a published Release belonging to main, after a backup', () => {
        expect(workflow.on.release.types).toEqual(['published']);
        expect(script).toContain('git merge-base --is-ancestor "$GITHUB_SHA" origin/main');
        expect(script.indexOf('./scripts/backup-db.sh')).toBeLessThan(script.indexOf('GRANT CREATE ON SCHEMA public'));
    });

    it('grants CREATE only to the connected DB role and revokes on both success and failure', () => {
        expect(script).toContain("pool.query('SELECT current_user')");
        expect(script).toContain("process.env.DB_NAME");
        expect(script).toContain('Invalid database role or database name');
        const trap = script.indexOf('trap revoke_schema_create EXIT');
        const grant = script.indexOf('GRANT CREATE ON SCHEMA public');
        const migration = script.indexOf('node scripts/migrate.js');
        const revoke = script.indexOf('revoke_schema_create\n', migration);
        const clearTrap = script.indexOf('trap - EXIT');
        expect(script).toContain('REVOKE CREATE ON SCHEMA public');
        expect(trap).toBeGreaterThan(0);
        expect(grant).toBeGreaterThan(trap);
        expect(migration).toBeGreaterThan(grant);
        expect(revoke).toBeGreaterThan(migration);
        expect(clearTrap).toBeGreaterThan(revoke);
        expect(script.indexOf('systemctl restart uver-setlist')).toBeGreaterThan(clearTrap);
    });
});
