import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from 'recharts';

const COLORS = ['#d4af37', '#fbbf24', '#b91c1c', '#3b82f6', '#10b981', '#6366f1', '#8b5cf6'];

const AlbumDistribution = ({ data, onBarClick }) => {
    if (!data || data.length === 0) return <div className="no-data">No Album Data</div>;

    // Filter out "Unknown" if desired, or keep it.
    // For now, let's keep it but maybe sort it last or color it differently.

    return (
        <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#444" />
                    <XAxis type="number" stroke="#fbbf24" allowDecimals={false} tick={{ fill: '#fbbf24' }} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#888"
                        width={120}
                        tick={{ fontSize: 12 }}
                        interval={0}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#333' }}
                        itemStyle={{ color: '#fbbf24' }}
                        labelStyle={{ color: '#ffffff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={onBarClick} style={{ cursor: 'pointer' }}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
                        ))}
                        <LabelList dataKey="value" position="right" fill="#fbbf24" />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AlbumDistribution;
