import React from 'react';
import { AlertTriangle, MapPin, Wrench } from 'lucide-react';
import { useEnvironment } from '../../hooks/useEnvironment';
import './EnvironmentBanner.css';

/**
 * 環境バッジコンポーネント
 * 本番環境以外で画面右上に環境情報を小さいバッジで表示
 */
export const EnvironmentBanner = () => {
    const { isProduction, label, color, textColor } = useEnvironment();

    // 本番環境では表示しない
    if (isProduction) {
        return null;
    }

    // 環境に応じたアイコン
    const getIcon = () => {
        if (label === '検証環境') return <AlertTriangle size={14} />;
        if (label === 'ローカル開発') return <Wrench size={14} />;
        return <MapPin size={14} />;
    };

    return (
        <div
            className="environment-banner"
            style={{
                backgroundColor: color,
                color: textColor
            }}
            role="banner"
            aria-label={`現在の環境: ${label}`}
            title={`現在の環境: ${label} - テスト専用環境`}
        >
            <span className="environment-banner__icon" aria-hidden="true">
                {getIcon()}
            </span>
            <span className="environment-banner__text">
                {label}
            </span>
        </div>
    );
};
