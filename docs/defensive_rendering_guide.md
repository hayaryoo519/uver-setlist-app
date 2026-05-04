# マイページ・ダッシュボードの防御的レンダリングの実装

本ドキュメントでは、ダッシュボードおよびマイページにおいて発生していた「白画面クラッシュ」を防ぐために導入された、防御的レンダリングとデータ正規化の仕組みについて解説します。

## 1. コア・コンセプト

「壊れたデータが来ても、UIを落とさない」という方針に基づき、以下の3層の防御を実装しています。

1.  **データ正規化レイヤー (Data Normalization)**: APIからのRawデータを、UIが期待する型に変換し、欠損値にはデフォルト値を補完します。
2.  **コンポーネント・ガード (Defensive Rendering)**: 各コンポーネント内でデータの存在・型・妥当性をチェックし、不正なデータは描画から除外、または安全なフォールバックを表示します。
3.  **エラー境界 (Error Boundary)**: 万が一レンダリング中にエラーが発生しても、そのコンポーネントのみを停止し、ページ全体のクラッシュを防ぎます。

## 2. データ正規化レイヤー

`src/lib/normalizers/dataNormalizer.ts` に共通の正規化ロジックを配置しています。

-   `normalizeLive(raw)`: ライブデータの補完（ID、タイトル、日付、会場名など）。
-   `normalizeSong(raw)`: 楽曲データの補完。
-   `safeDate(dateStr)`: 無効な日付（Invalid Date）を避け、安全なDateオブジェクトまたはデフォルト値を返します。

### Hookでの利用例 (`useLiveStats.ts`)
```typescript
const { data: attendedLives = [], refetch } = useAttendedLives();
const normalizedLives = useMemo(() => attendedLives.map(normalizeLive), [attendedLives]);
```

## 3. コンポーネント・レベルの防御

可視化コンポーネント（特にRechartsを使用するもの）では、以下のガードを徹底しています。

-   **数値バリデーション**: `NaN` や `undefined` がグラフに渡らないよう、描画前にフィルタリングします。
-   **空状態のハンドリング**: データが空の場合に「No Data」ではなく、一貫したデザインの「データがありません」メッセージを表示します。

### 実装例 (`LiveGraph.jsx`)
```javascript
const safeData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(d => d && typeof d[dataKey] === 'number' && !isNaN(d[dataKey]));
}, [data, dataKey]);
```

## 4. ErrorBoundary とリカバリ

各ウィジェットは個別の `ErrorBoundary` で保護されています。

-   **テレメトリ**: 発生したエラー、コンポーネントスタック、URLをコンソール（および将来的な監視サービス）に出力します。
-   **再試行 (Retry)**: TanStack Queryの `refetch` をバインドしており、エラー発生時にユーザーが「再試行」ボタンを押すことで、データの再取得とコンポーネントの復旧が可能です。

## 5. 開発者へのガイドライン

-   新しい可視化コンポーネントを作成する際は、必ず `dataNormalizer.ts` の関数を介してデータを受け取るようにしてください。
-   APIレスポンスの型が変わる場合は、まず正規化レイヤーを更新してください。
-   コンポーネント内で `map` や `filter` を行う前に、必ず配列であることのチェックを入れてください。
