import { useEffect } from 'react';
import { useEnvironment } from './useEnvironment';

/**
 * ドキュメントのタイトルに環境プレフィックスを追加するフック
 * 本番環境以外では [環境名] が先頭に追加される
 */
export const useEnvironmentTitle = () => {
    const { isProduction, label } = useEnvironment();

    useEffect(() => {
        const baseTitle = 'UVERworld Setlist Archive';

        if (!isProduction) {
            document.title = `[${label}] ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }

        // クリーンアップ
        return () => {
            document.title = baseTitle;
        };
    }, [isProduction, label]);
};
