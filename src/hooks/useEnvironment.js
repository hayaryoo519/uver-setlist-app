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

        // 環境判定の優先順位: VITE_APP_ENV > MODE
        const envName = viteEnv || mode;

        if (envName === 'staging') {
            return {
                name: 'staging',
                label: '検証環境',
                color: '#FF9800', // オレンジ
                textColor: '#ffffff'
            };
        } else if (envName === 'development') {
            return {
                name: 'development',
                label: 'ローカル開発',
                color: '#4CAF50', // 緑
                textColor: '#ffffff'
            };
        } else {
            return {
                name: 'production',
                label: '本番',
                color: null,
                textColor: null
            };
        }
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
