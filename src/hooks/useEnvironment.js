import { useMemo } from 'react';

/**
 * 現在の環境を判定するカスタムフック
 * @returns {Object} 環境情報
 *   - name: 環境名 ('development' | 'staging' | 'production')
 *   - label: 表示用ラベル
 *   - color: バッジの背景色
 *   - isProduction: 本番環境かどうか
 */
export const useEnvironment = () => {
    const env = useMemo(() => {
        // Viteの環境変数から環境を判定
        const mode = import.meta.env.MODE;
        const viteEnv = import.meta.env.VITE_APP_ENV;

        // URLベースの判定（フォールバック）
        const hostname = window.location.hostname;
        const port = window.location.port;

        // 環境判定の優先順位: VITE_APP_ENV > MODE > URL判定
        let envName = viteEnv || mode;

        // URL/ポートベースの判定（環境変数がない場合）
        if (!viteEnv && !mode) {
            // 検証サーバー: 192.168.0.13:9001
            if (hostname === '192.168.0.13' && port === '9001') {
                envName = 'staging';
            }
            // 本番サーバー: 192.168.0.13:8000
            else if (hostname === '192.168.0.13' && port === '8000') {
                envName = 'production';
            }
            // ローカル開発: localhost
            else if (hostname === 'localhost' || hostname === '127.0.0.1') {
                envName = 'development';
            }
        }

        // 環境ごとの設定
        const environments = {
            development: {
                name: 'development',
                label: 'ローカル開発',
                color: '#10b981', // 濃い緑
                textColor: '#ffffff'
            },
            staging: {
                name: 'staging',
                label: '検証環境',
                color: '#f97316', // 濃いオレンジ
                textColor: '#ffffff'
            },
            production: {
                name: 'production',
                label: '本番',
                color: null,
                textColor: null
            }
        };

        return environments[envName] || environments.production;
    }, []);

    const isProduction = env.name === 'production';
    const isDevelopment = env.name === 'development';
    const isStaging = env.name === 'staging';

    return {
        ...env,
        isProduction,
        isDevelopment,
        isStaging
    };
};
