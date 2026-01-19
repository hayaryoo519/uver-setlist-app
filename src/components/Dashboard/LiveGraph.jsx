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
    if (!data || data.length === 0) return <div className="no-data">No Data</div>;

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

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="year" stroke="#888" />
                    <YAxis
                        stroke="#888"
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
