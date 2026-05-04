import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label, dataKey, unitLabel }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip" style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                padding: '10px',
                borderRadius: '8px'
            }}>
                <p className="label" style={{ color: '#94a3b8', marginBottom: '4px' }}>{`${label}年`}</p>
                <p className="intro" style={{ color: '#d4af37', fontWeight: 'bold' }}>
                    {`${payload[0].value} ${unitLabel || '公演'}`}
                </p>
            </div>
        );
    }
    return null;
};

const LiveGraph = ({ data, onBarClick, dataKey = "count", label }) => {
    // データバリデーション: 数値かつ有効なデータのみを抽出
    const safeData = React.useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data.filter(d => 
            d && 
            typeof d[dataKey] === 'number' && 
            !isNaN(d[dataKey])
        );
    }, [data, dataKey]);

    if (safeData.length === 0) {
        return (
            <div style={{ 
                height: 300, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '0.9rem',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '12px'
            }}>
                データがありません
            </div>
        );
    }

    const handleClick = (data) => {
        if (onBarClick && data && data.year) {
            onBarClick(data);
        }
    };

    // Determine unit label based on dataKey
    const getUnitLabel = () => {
        if (label) return label;
        switch (dataKey) {
            case 'liveCount':
                return '公演';
            case 'totalSongs':
                return '曲';
            case 'avgSongs':
                return '曲/公演';
            default:
                return '公演';
        }
    };

    // Responsive width for YAxis
    const [yWidth, setYWidth] = React.useState(40);

    React.useEffect(() => {
        const handleResize = () => {
            setYWidth(window.innerWidth <= 480 ? 30 : 40);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={safeData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis dataKey="year" stroke="#888" tick={{ fontSize: 11 }} />
                    <YAxis
                        stroke="#888"
                        width={yWidth}
                        tick={{ fontSize: 11 }}
                        allowDecimals={dataKey === 'avgSongs'}
                    />
                    <Tooltip
                        content={<CustomTooltip dataKey={dataKey} unitLabel={getUnitLabel()} />}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    <Bar
                        dataKey={dataKey}
                        fill="var(--primary-color)"
                        radius={[4, 4, 0, 0]}
                        onClick={handleClick}
                        cursor="pointer"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LiveGraph;
