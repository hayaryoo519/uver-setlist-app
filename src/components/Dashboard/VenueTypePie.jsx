import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#d4af37', '#fbbf24', '#b91c1c', '#FFFFFF'];

const VenueTypeBar = ({ data, onBarClick }) => {
    if (!data || data.length === 0) return <div className="no-data">No Data</div>;

    const handleClick = (data) => {
        if (onBarClick && data && data.name) {
            onBarClick(data.name);
        }
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical">
                    <XAxis type="number" stroke="#888" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#888" width={100} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#d4af37' }}
                    />
                    <Bar
                        dataKey="value"
                        fill="var(--primary-color)"
                        radius={[0, 4, 4, 0]}
                        onClick={handleClick}
                        cursor="pointer"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default VenueTypeBar;
