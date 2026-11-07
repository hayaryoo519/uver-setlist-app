import SEO from '../components/SEO';

// アクセス解析に関するプライバシー説明ページ（Issue #252）
// 掲載内容は実際の計測設定と一致させること。計測仕様を変えたら本文も更新する。
const Privacy = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: '#cbd5e1', lineHeight: 1.8 }}>
        <SEO title="プライバシー" description="アクセス解析の利用とプライバシーについて" />
        <h1 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '8px' }}>プライバシー</h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>最終更新: 2026年10月25日</p>

        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '32px 0 12px' }}>アクセス解析について</h2>
        <p>
            本サイトでは、どのページが見られているかを把握し、今後の機能改善に役立てるためにアクセス解析ツール（Umami）を使用しています。
        </p>

        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '32px 0 12px' }}>収集する情報</h2>
        <ul style={{ paddingLeft: '20px' }}>
            <li>閲覧されたページのパス（ページのアドレスからクエリ文字列を除いたもの）</li>
            <li>参照元のサイト、ブラウザやデバイスの種類、おおまかな地域などの集計情報</li>
            <li>シェアボタンなど、一部のボタンが押されたこと（イベント名のみ）</li>
        </ul>

        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '32px 0 12px' }}>収集しない情報</h2>
        <ul style={{ paddingLeft: '20px' }}>
            <li>Cookie（トラッキング用の識別子）</li>
            <li>メールアドレス、ユーザー名、ユーザーIDなどの個人を特定できる情報</li>
            <li>URL のクエリ文字列（パスワード再設定などのトークンを含みません）</li>
            <li>入力内容、検索語、パスワード</li>
        </ul>

        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '32px 0 12px' }}>計測の対象外</h2>
        <p>開発・検証用の環境（本番ドメイン以外からのアクセス）は計測しません。</p>

        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '32px 0 12px' }}>利用目的</h2>
        <p>ページの人気や利用の流れを集計し、機能の配置や改善の判断に使います。集計結果を個人の行動の追跡には使いません。</p>
    </div>
);

export default Privacy;
