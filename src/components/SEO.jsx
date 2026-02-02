import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useEnvironment } from '../hooks/useEnvironment';

const SEO = ({ title, description }) => {
    const { isProduction, label } = useEnvironment();
    const siteTitle = 'UVERworld Setlist Archive';

    // 環境プレフィックスを追加
    const environmentPrefix = !isProduction ? `[${label}] ` : '';
    const pageTitle = title ? `${environmentPrefix}${title} | ${siteTitle}` : `${environmentPrefix}${siteTitle}`;

    const metaDescription = description || 'UVERworldの公式非公式セットリストアーカイブサイト。過去のライブ、ツアーごとの分析、あなただけの参戦記録を作成できます。';

    return (
        <Helmet>
            <title>{pageTitle}</title>
            <meta name="description" content={metaDescription} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={metaDescription} />
        </Helmet>
    );
};

export default SEO;
