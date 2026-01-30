import React from 'react';
import { useEnvironment } from '../../hooks/useEnvironment';
import './EnvironmentBanner.css';

/**
 * 環境バッジコンポーネント
 * 本番環境以外で画面上部に環境情報を表示
 */
export const EnvironmentBanner = () => {
    const { isProduction, label, color, textColor } = useEnvironment();

    // 本番環境では表示しない
    if (isProduction) {
        return null;
    }

    // 環境に応じたアイコン
    const getIcon = () => {
        if (label === '検証環境') return '⚠️';
        if (label === 'ローカル開発') return '🔧';
        return '📍';
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
        >
            <span className="environment-banner__icon" aria-hidden="true">
                {getIcon()}
            </span>
            <span className="environment-banner__text">
                {label}
            </span>
            <span className="environment-banner__note">
                - テスト専用環境
            </span>
        </div>
    );
};
