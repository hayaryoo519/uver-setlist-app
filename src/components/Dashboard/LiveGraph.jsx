import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const LiveGraph = ({ data, onBarClick, dataKey = "count" }) => {
    if (!data || data.length === 0) return <div className="no-data">No Data</div>;

    const handleClick = (data) => {
        if (onBarClick && data && data.year) {
            onBarClick(data.year);
        }
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data}>
                    <XAxis dataKey="year" stroke="#888" />
                    <YAxis
                        stroke="#888"
                        allowDecimals={dataKey === 'avgSongs'}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#d4af37' }}
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
