import { useMemo } from 'react';

type EnvName = 'development' | 'staging' | 'production';

interface EnvInfo {
    name: EnvName;
    label: string;
    color: string | null;
    textColor: string | null;
    isProduction: boolean;
    isDevelopment: boolean;
    isStaging: boolean;
}

export const useEnvironment = (): EnvInfo => {
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
            // Staging server (port 9001)
            if (port === '9001') {
                envName = 'staging';
            }
            // Production server (port 8000)
            else if (port === '8000') {
                envName = 'production';
            }
            // Local development
            else if (hostname === 'localhost' || hostname === '127.0.0.1') {
                envName = 'development';
            }
        }

        // 環境ごとの設定
        const environments: Record<EnvName, { name: EnvName; label: string; color: string | null; textColor: string | null }> = {
            development: {
                name: 'development',
                label: 'ローカル開発',
                color: '#10b981',
                textColor: '#ffffff'
            },
            staging: {
                name: 'staging',
                label: '検証環境',
                color: '#f97316',
                textColor: '#ffffff'
            },
            production: {
                name: 'production',
                label: '本番',
                color: null,
                textColor: null
            }
        };

        return environments[envName as EnvName] ?? environments.production;
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
