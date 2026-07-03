# 無限スクロール機能 実装計画書

## 現状分析

### src/components/posts/PostList.tsx（現在の仕組み）
- `.limit(50)` で最初の50件を一括取得
- `refreshTrigger` 変更時に全件再取得
- タブ切り替え（"all" / "following"）に対応

### 問題点
- 投稿が増えると初期ロードが重くなる
- すべてのデータを一括取得している

---

## 実装アプローチ

**カーソルベースのページネーション + Intersection Observer API**

| 項目 | 設定値 |
|------|--------|
| カーソル | `created_at` タイムスタンプを使用 |
| 1回のロード件数 | 10件 |
| 検知位置 | リストの最後から3件目で次ページをロード |
| Observer threshold | 0.1（10%見えたら発火） |

---

## ファイル構成

### 新規作成ファイル

#### 1. src/hooks/useInfiniteScroll.ts
Intersection Observer を管理するカスタムフック

**インターフェース:**
```typescript
interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

interface UseInfiniteScrollResult {
  ref: (node: HTMLElement | null) => void;
}

export function useInfiniteScroll(
  hasNext: boolean,
  onLoadMore: () => void,
  options?: UseInfiniteScrollOptions
): UseInfiniteScrollResult
```

**実装内容:**
- `IntersectionObserver` の作成・管理
- `hasNext=false` ときはobserveしない
- マウント/アンマウント時のクリーンアップ
- `threshold` デフォルト0.1

---

#### 2. src/hooks/useInfinitePosts.ts
投稿の無限スクロールロジックを管理するカスタムフック

**インターフェース:**
```typescript
interface UseInfinitePostsResult {
  posts: PostWithProfile[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  ref: (node: HTMLElement | null) => void;
  error: string;
}

export function useInfinitePosts(
  filterType: "all" | "following",
  refreshTrigger: number,
  userId?: string
): UseInfinitePostsResult
```

**実装内容:**
- **状態管理**: `posts`, `loading`, `loadingMore`, `hasMore`, `lastCreatedAt`
- **fetchAllPosts / fetchFollowingPosts**:
  - 初回: `.limit(10)`
  - 追加: `.lt('created_at', lastCreatedAt).limit(10)`
- **loadMore**: 次ページを取得して `posts` に追加
- **useInfiniteScroll** と連携
- `refreshTrigger` 変更時はリセットして再取得

---

### 修正ファイル

#### 3. src/components/posts/PostList.tsx

**変更点:**
1. `useInfinitePosts` フックを使用
2. ローカル状態を削除（フックで管理）
3. 投稿表示は `posts.map()` でそのまま表示
4. 最後から3番目の要素に `ref` をアタッチ
5. ローディング表示を調整:
   - 初回: "読み込み中..."
   - 追加: スピナー表示
6. `hasMore=false` 時は「これ以上投稿はありません」表示

---

### テストファイル

#### 4. tests/infinite-scroll.spec.ts

**テストケース:**
1. 初回10件が表示される
2. スクロールすると追加で10件読み込まれる
3. すべて読み込むとメッセージが表示される
4. フォロー中タブでも同様に動作
5. 投稿作成後にリストが更新される

---

## 実装順序

1. **src/hooks/useInfiniteScroll.ts** の作成
2. **src/hooks/useInfinitePosts.ts** の作成
3. **src/components/posts/PostList.tsx** の修正
4. **tests/infinite-scroll.spec.ts** の作成
5. 動作確認とテスト実行

---

## 動作確認チェックリスト

- [ ] 初回ロードで10件表示される
- [ ] スクロールで追加10件読み込まれる
- [ ] すべて読み込むとメッセージ表示
- [ ] タブ切り替えでも正しく動作
- [ ] 投稿作成後にリスト更新
- [ ] フォロー中タブでフォロー外のユーザー投稿が表示されない
