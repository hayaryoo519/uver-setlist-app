import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, BarChart2, Music, ArrowRight } from 'lucide-react';

const MyPageOnboarding = () => {
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '60px'
        }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: 'var(--text-color)' }}>
                あなたの<span className="text-gold">参戦履歴</span>を作ろう
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '40px', lineHeight: '1.6' }}>
                参加したライブを記録するだけで、あなただけのアーカイブが完成します。<br />
                過去の思い出をデータで可視化してみませんか？
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px',
                textAlign: 'left'
            }}>
                <FeatureItem
                    icon={<BarChart2 size={24} color="var(--primary-color)" />}
                    title="年度別グラフ"
                    desc="毎年の参戦数をグラフで振り返り"
                />
                <FeatureItem
                    icon={<Music size={24} color="var(--primary-color)" />}
                    title="聴いた曲ランキング"
                    desc="あなたが最も聴いた曲がわかります"
                />
                <FeatureItem
                    icon={<ClipboardList size={24} color="var(--primary-color)" />}
                    title="会場別データ"
                    desc="アリーナ、ホール、ライブハウス別の統計"
                />
            </div>

            <Link
                to="/lives"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: 'var(--primary-color)',
                    color: '#000',
                    fontWeight: 'bold',
                    padding: '16px 32px',
                    borderRadius: '50px',
                    textDecoration: 'none',
                    fontSize: '1.1rem',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.4)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)';
                }}
            >
                ライブ一覧から記録をはじめる <ArrowRight size={20} />
            </Link>
        </div>
    );
};

const FeatureItem = ({ icon, title, desc }) => (
    <div style={{
        background: 'rgba(0,0,0,0.2)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)'
    }}>
        <div style={{ marginBottom: '10px' }}>{icon}</div>
        <h3 style={{ fontSize: '1rem', margin: '0 0 5px 0' }}>{title}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{desc}</p>
    </div>
);

export default MyPageOnboarding;
