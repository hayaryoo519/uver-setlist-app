const router = require('express').Router();
const { authorize, adminCheck } = require('../middleware/authorization');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

router.use(authorize);
router.use(adminCheck);

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/postgres';
const BACKUP_SCRIPT = path.join(__dirname, '../../scripts/backup-db.sh');

// バックアップファイル一覧取得
router.get('/backups', (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.json({ backups: [] });
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.dump.gz') || f.endsWith('.dump'))
            .map(f => {
                const stat = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    filename: f,
                    size:     stat.size,
                    created_at: stat.mtime.toISOString(),
                };
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20);

        res.json({ backups: files });
    } catch (err) {
        console.error('[admin/backups] Error:', err.message);
        res.status(500).json({ message: 'バックアップ一覧の取得に失敗しました' });
    }
});

// バックアップ実行
router.post('/backup', (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
        return res.status(403).json({ message: 'バックアップは本番環境でのみ実行できます' });
    }

    if (!fs.existsSync(BACKUP_SCRIPT)) {
        return res.status(500).json({ message: 'バックアップスクリプトが見つかりません' });
    }

    console.log('[admin/backup] Starting DB backup triggered by admin');

    const proc = spawn('bash', [BACKUP_SCRIPT], {
        env: { ...process.env },
        timeout: 10 * 60 * 1000, // 10分タイムアウト
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
        if (code === 0) {
            // 完了したファイル名をログから取得
            const match = stdout.match(/backup_[\d_]+\.dump(?:\.gz)?/);
            const filename = match ? match[0] : null;
            console.log('[admin/backup] Backup completed:', filename);
            res.json({ success: true, filename, message: 'バックアップが完了しました' });
        } else {
            console.error('[admin/backup] Backup failed. stderr:', stderr);
            res.status(500).json({ success: false, message: 'バックアップに失敗しました', detail: stderr.slice(-500) });
        }
    });

    proc.on('error', err => {
        console.error('[admin/backup] Process error:', err.message);
        res.status(500).json({ success: false, message: `スクリプト実行エラー: ${err.message}` });
    });
});

module.exports = router;
