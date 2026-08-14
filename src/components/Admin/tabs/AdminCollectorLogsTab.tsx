import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import { useCollectorLogs } from '../../../hooks/queries/useCollectorLogs';
import CollectorLogsViewRaw from '../CollectorLogsView';
const CollectorLogsView = CollectorLogsViewRaw as any;

const LIMITS = [10, 50, 100, 200];

const AdminCollectorLogsTab = () => {
    const [limit, setLimit] = useState(50);
    const { data: logs = [], isLoading } = useCollectorLogs(limit);

    return (
        <div className="tab-content fade-in">
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>表示件数</span>
                {LIMITS.map((n) => (
                    <button
                        key={n}
                        onClick={() => setLimit(n)}
                        style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: `1px solid ${limit === n ? '#3b82f6' : '#334155'}`,
                            background: limit === n ? '#3b82f620' : '#1e293b',
                            color: limit === n ? '#60a5fa' : '#94a3b8',
                        }}
                    >
                        {n}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader className="spin" size={32} color="var(--primary-color)" />
                </div>
            ) : (
                <CollectorLogsView logs={logs} />
            )}
        </div>
    );
};

export default AdminCollectorLogsTab;
