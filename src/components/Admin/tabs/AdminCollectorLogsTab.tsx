import React from 'react';
import { Loader } from 'lucide-react';
import { useCollectorLogs } from '../../../hooks/queries/useCollectorLogs';
import CollectorLogsViewRaw from '../CollectorLogsView';
const CollectorLogsView = CollectorLogsViewRaw as any;

const AdminCollectorLogsTab = () => {
    const { data: logs = [], isLoading } = useCollectorLogs();

    return (
        <div className="tab-content fade-in">
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
