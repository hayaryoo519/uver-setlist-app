import React, { useState } from 'react';
import { Upload, Loader } from 'lucide-react';

const AdminImportTab = () => {
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleCSVImport = async () => {
        if (!importFile) return;
        setIsImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/import/csv', {
                method: 'POST',
                headers: { token } as HeadersInit,
                body: formData,
            });
            const data: any = await res.json();
            if (res.ok) {
                setImportResult({ success: true, ...data });
                setImportFile(null);
            } else {
                setImportResult({ success: false, message: data.message || 'Import failed' });
            }
        } catch (err) {
            setImportResult({ success: false, message: 'Error: ' + (err as any).message });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="tab-content fade-in">
            <h3 style={{ marginBottom: '20px' }}>CSV Import</h3>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '15px', color: '#cbd5e1' }}>CSVフォーマット</h4>
                <pre style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {`live_date,venue,prefecture,tour,tags,order_no,song\n2025-11-15,大阪城ホール,大阪府,BOOM GOES THE WORLD,,1,PHOENIX AX\n2025-11-15,大阪城ホール,大阪府,BOOM GOES THE WORLD,Encore,2,CORE PRIDE`}
                </pre>
                <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#94a3b8' }}>
                    <p>• 同じ日付・会場の行は同一ライブとして扱われます</p>
                    <p>• 日付が未来の場合、自動的に <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>status=SCHEDULED</code> が設定されます</p>
                    <p>• 会場名から自動的にタイプ（ARENA/HALL/LIVEHOUSE）が判定されます</p>
                    <p>• tagsに"Encore"を指定すると、アンコール曲として登録されます</p>
                </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '12px', border: '1px solid #334155' }}>
                <h4 style={{ marginBottom: '15px', color: '#cbd5e1' }}>ファイルアップロード</h4>
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                    style={{ display: 'block', marginBottom: '15px', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', width: '100%' }}
                />
                {importFile && (
                    <div style={{ marginBottom: '15px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        選択ファイル: <strong style={{ color: '#fff' }}>{importFile.name}</strong>
                    </div>
                )}
                <button
                    onClick={handleCSVImport}
                    disabled={!importFile || isImporting}
                    className="btn-primary"
                    style={{ opacity: (!importFile || isImporting) ? 0.5 : 1, cursor: (!importFile || isImporting) ? 'not-allowed' : 'pointer' }}
                >
                    {isImporting ? <><Loader size={18} className="animate-spin" /> インポート中...</> : <><Upload size={18} /> CSVをインポート</>}
                </button>
                {importResult && (
                    <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', background: importResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${importResult.success ? '#22c55e' : '#ef4444'}` }}>
                        <h5 style={{ color: importResult.success ? '#22c55e' : '#ef4444', marginBottom: '10px' }}>
                            {importResult.success ? '✓ インポート成功' : '✗ インポート失敗'}
                        </h5>
                        {importResult.success && importResult.stats && (
                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                                <p>• 新規ライブ: {importResult.stats.livesCreated}件</p>
                                <p>• 更新ライブ: {importResult.stats.livesUpdated}件</p>
                                <p>• 新規楽曲: {importResult.stats.songsAdded}件</p>
                                <p>• 処理行数: {importResult.stats.totalRows}行</p>
                            </div>
                        )}
                        {!importResult.success && <p style={{ color: '#fca5a5' }}>{importResult.message}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminImportTab;
