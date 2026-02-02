import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from 'recharts';

const COLORS = ['#d4af37', '#fbbf24', '#b91c1c', '#3b82f6', '#10b981', '#6366f1', '#8b5cf6'];

const CustomYAxisTick = ({ x, y, payload, fontSize }) => {
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={4}
                textAnchor="end"
                fill="#888"
                fontSize={fontSize}
                style={{ whiteSpace: 'nowrap' }} // SVG doesn't strictly obey this but it helps in some contexts, main thing is <text> doesn't wrap by default
            >
                {payload.value}
            </text>
        </g>
    );
};

const AlbumDistribution = ({ data, onBarClick }) => {
    if (!data || data.length === 0) return <div className="no-data">No Album Data</div>;

    // Filter out "Unknown" if desired, or keep it.
    // For now, let's keep it but maybe sort it last or color it differently.

    // Calculate height based on data length to ensure all bars are visible
    // Allow approx 30-40px per bar + padding
    const calculatedHeight = Math.max(400, data.length * 35 + 50);

    // Calculate dynamic ticks for XAxis (every 100 units)
    // User request: Set max to at least 700, but allow growth (variable)
    const maxValue = Math.max(...data.map(d => d.value), 0);
    const maxTick = Math.max(700, Math.ceil(maxValue / 100) * 100);
    const ticks = [];
    for (let i = 0; i <= maxTick; i += 100) {
        ticks.push(i);
    }

    // Responsive width for YAxis
    const [yAxisConfig, setYAxisConfig] = React.useState({ width: 120, fontSize: 11 });

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 480) {
                setYAxisConfig({ width: 60, fontSize: 9 });
            } else {
                setYAxisConfig({ width: 120, fontSize: 11 });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ width: '100%', height: calculatedHeight, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#444" />
                    <XAxis
                        type="number"
                        stroke="#fbbf24"
                        allowDecimals={false}
                        tick={{ fill: '#fbbf24', fontSize: 11 }}
                        domain={[0, 'auto']}
                        ticks={ticks}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#888"
                        width={yAxisConfig.width}
                        tick={<CustomYAxisTick fontSize={yAxisConfig.fontSize} />}
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
                        <LabelList dataKey="value" position="right" fill="#fbbf24" fontSize={12} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AlbumDistribution;
