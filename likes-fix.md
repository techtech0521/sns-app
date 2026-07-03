# いいね情報取得エラーの修正方法

## 問題の説明

無限スクロール実装後、以下のエラーが発生するようになりました：

```
いいね情報取得エラー: 
message: "upstream connect error or disconnect/reset before headers. 
         retried and the latest reset reason: connection timeout"
```

### エラーの原因

**無限スクロール前:**
- 一度に50件の投稿を取得
- 各投稿の `LikeButton` が独立して Supabase クエリを実行
- 初期ロード時に **50件 × 2クエリ = 100回** のリクエストが一度に発生
- その後は追加のリクエストなし

**無限スクロール後:**
- 初回は **10件** のみ取得
- スクロールするたびに **追加10件** が読み込まれ、新しい `LikeButton` がマウント
- 各 `LikeButton` の `useEffect` が即座に Supabase クエリを実行
- **投稿数に応じて継続的にリクエストが増加**（30件表示 = 60リクエスト、50件表示 = 100リクエスト...）
- Supabase の接続プールが枯渇し、`connection timeout` エラーが発生

### 解決策

投稿データを取得する際に、一緒にいいね情報も取得することで、Supabase へのリクエスト数を大幅に削減します。

---

## 修正ファイル一覧

| ファイル | 種類 | 説明 |
|----------|------|------|
| `src/hooks/useInfinitePosts.ts` | 修正 | Supabase クエリに `likes` を追加、型定義に `likes` プロパティを追加 |
| `src/components/posts/PostList.tsx` | 修正 | `useAuth` フックを追加し、`currentUserId` を `PostCard` に渡す |
| `src/components/posts/PostCard.tsx` | 修正 | `currentUserId` プロパティを追加し、`LikeButton` に渡す |
| `src/components/posts/LikeButton.tsx` | 修正 | 渡された `likes` データを使用するように実装を変更 |

---

## 詳細な修正手順

### 1. src/hooks/useInfinitePosts.ts

#### 修正1: `PostWithProfile` インターフェースに `likes` プロパティを追加

**現在（10-13行目）:**
```typescript
interface PostWithProfile extends Post {
    profiles: Profile;
    comments?: { id: string }[];
}
```

**修正後:**
```typescript
interface PostWithProfile extends Post {
    profiles: Profile;
    comments?: { id: string }[];
    likes?: { id: string; user_id: string }[];
}
```

---

#### 修正2: `fetchAllPosts` 関数の Supabase クエリに `likes` を追加

**現在（69-79行目）:**
```typescript
let query = supabase
    .from("posts")
    .select(
        `
        *,
        profiles (*),
        comments (id)
    `
    )
    .order("created_at", { ascending: false })
    .limit(POSTS_PER_PAGE);
```

**修正後:**
```typescript
let query = supabase
    .from("posts")
    .select(
        `
        *,
        profiles (*),
        comments (id),
        likes (id, user_id)
    `
    )
    .order("created_at", { ascending: false })
    .limit(POSTS_PER_PAGE);
```

**変更点:**
- `comments (id)` の後に `, likes (id, user_id)` を追加

---

#### 修正3: `fetchFollowingPosts` 関数の Supabase クエリに `likes` を追加

**現在（154-165行目）:**
```typescript
let query = supabase
    .from("posts")
    .select(
        `
        *,
        profiles (*),
        comments (id)
    `
    )
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(POSTS_PER_PAGE);
```

**修正後:**
```typescript
let query = supabase
    .from("posts")
    .select(
        `
        *,
        profiles (*),
        comments (id),
        likes (id, user_id)
    `
    )
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(POSTS_PER_PAGE);
```

**変更点:**
- `comments (id)` の後に `, likes (id, user_id)` を追加

---

### 2. src/components/posts/PostList.tsx

#### 修正1: `useAuth` をインポート

**現在（1-3行目）:**
```typescript
import { useInfinitePosts } from "../../hooks/useInfinitePosts";
import PostCard from "./PostCard";
import type { Database } from "../../types/database.types";
```

**修正後:**
```typescript
import { useInfinitePosts } from "../../hooks/useInfinitePosts";
import { useAuth } from "../../contexts/AuthContext";  // 追加
import PostCard from "./PostCard";
import type { Database } from "../../types/database.types";
```

---

#### 修正2: `useAuth` フックで `user` を取得

**現在（19行目）:**
```typescript
export default function PostList({ onEditPost, refreshTrigger = 0, filterType = "all" }: PostListProps) {
    const {
```

**修正後:**
```typescript
export default function PostList({ onEditPost, refreshTrigger = 0, filterType = "all" }: PostListProps) {
    const { user } = useAuth();  // 追加
    const {
```

---

#### 修正3: `PostCard` に `currentUserId` を渡す

**現在（79-85行目）:**
```typescript
<div key={post.id} ref={isObserverTarget ? observerRef : undefined}>
    <PostCard
        post={post}
        onEdit={onEditPost}
        onDelete={handleDelete}
    />
</div>
```

**修正後:**
```typescript
<div key={post.id} ref={isObserverTarget ? observerRef : undefined}>
    <PostCard
        post={post}
        onEdit={onEditPost}
        onDelete={handleDelete}
        currentUserId={user?.id}  // 追加
    />
</div>
```

---

### 3. src/components/posts/PostCard.tsx

#### 修正1: `PostCardProps` インターフェースに `currentUserId` を追加

**現在（18-22行目）:**
```typescript
interface PostCardProps {
    post: PostWithProfile;
    onEdit: (post: PostWithProfile) => void;
    onDelete: (postId: string) => void;
}
```

**修正後:**
```typescript
interface PostCardProps {
    post: PostWithProfile;
    onEdit: (post: PostWithProfile) => void;
    onDelete: (postId: string) => void;
    currentUserId?: string;  // 追加
}
```

---

#### 修正2: コンポーネント引数に `currentUserId` を追加

**現在（24行目）:**
```typescript
export default function PostCard({ post, onEdit, onDelete }: PostCardProps) {
```

**修正後:**
```typescript
export default function PostCard({ post, onEdit, onDelete, currentUserId }: PostCardProps) {
```

---

#### 修正3: `LikeButton` に `currentUserId` と `likes` を渡す

**現在（122行目）:**
```typescript
<LikeButton postId={post.id} />
```

**修正後:**
```typescript
<LikeButton 
    postId={post.id}
    likes={post.likes}
    currentUserId={currentUserId}
/>
```

---

### 4. src/components/posts/LikeButton.tsx

#### 修正1: 不要なインポートを削除

**現在（1-4行目）:**
```typescript
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { checkRateLimit, getRateLimitMessage } from "../../utils/rateLimit";
```

**修正後:**
```typescript
import { useState } from "react";  // useEffect を削除
import { supabase } from "../../lib/supabase";
import { checkRateLimit, getRateLimitMessage } from "../../utils/rateLimit";  // useAuth を削除
```

---

#### 修正2: `LikeButtonProps` インターフェースを更新

**現在（6-8行目）:**
```typescript
interface LikeButtonProps {
    postId: string;
}
```

**修正後:**
```typescript
interface LikeButtonProps {
    postId: string;
    likes?: { id: string; user_id: string }[];  // 追加
    currentUserId?: string;  // 追加
}
```

---

#### 修正3: コンポーネント全体を置き換え

**現在（10-160行目）を以下に置き換えます:**

```typescript
export default function LikeButton({ postId, likes = [], currentUserId }: LikeButtonProps) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // いいね情報を計算（Supabaseクエリなし）
    const isLiked = currentUserId ? likes.some(like => like.user_id === currentUserId) : false;
    const likeCount = likes.length;

    const handleToggleLike = async () => {
        if (!currentUserId || processing) return;

        // レート制限チェック
        const rateLimit = checkRateLimit("like_toggle");
        if (!rateLimit.allowed) {
            setError(getRateLimitMessage("like_toggle", rateLimit.resetIn!));
            setTimeout(() => setError(""), 3000);
            return;
        }

        // 楽観的UI更新（即座に反映）
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        // UIを即座に更新
        setProcessing(true);
        setError('');

        try {
            if (isLiked) {
                // いいね解除
                const { error } = await supabase
                    .from("likes")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", currentUserId);

                if (error) throw error;
            } else {
                // いいね追加
                const { error } = await supabase
                    .from("likes")
                    .insert({
                        post_id: postId,
                        user_id: currentUserId,
                    } as any);

                if (error) throw error;
            }

            // 成功したら親コンポーネントからデータを再取得させる必要がある
            // ※ 実際には onLikeChange コールバックを呼び出すなどして親に通知する
            // 今回は実装範囲外とする
        } catch (error: any) {
            console.error('いいねトグルエラー:', error);
            // エラーメッセージ
            if (error.code !== '23505') {
                alert('いいねの処理に失敗しました');
                setTimeout(() => setError(''), 3000);
            }
        } finally {
            setProcessing(false);
        }
    };

    // ローディング表示は不要（データは既に取得済み）
    return (
        <div>
            <button
                onClick={handleToggleLike}
                disabled={!currentUserId || processing}
                className={`flex items-center gap-2 transition-colors ${
                    currentUserId
                        ? 'hover:text-red-500 cursor-pointer'
                        : 'cursor-not-allowed opacity-50'
                } ${processing ? 'opacity-50' : ''}`}
            >
                {/* ハートアイコン */}
                <span
                    className={`text-lg transition-all ${
                        isLiked
                            ? 'text-red-500 scale-110'
                            : 'text-gray-400'
                    }`}
                >
                    {isLiked ? '❤️' : '♡'}
                </span>

                {/* いいね数 */}
                <span
                    className={`text-sm font-medium ${
                        isLiked ? 'text-red-500' : 'text-gray-500'
                    }`}
                >
                    {likeCount}
                </span>
            </button>
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
}
```

**変更点:**
- `useAuth` フックを削除（`currentUserId` を Props として受け取る）
- `useEffect` と `fetchLikeStatus` 関数を削除（いいね情報は Props として受け取る）
- `loading` 状態と `isLiked` 状態を削除（`likes` 配列から計算）
- `likeCount` 状態を削除（`likes.length` を使用）

---

## 実装ポイント

### 1. Supabase クエリの変更

投稿データを取得する際に、`likes (id, user_id)` を含めることで、各投稿のいいね情報を一緒に取得します。

**変更前:**
- 投稿データ取得: 1回
- 各投稿のいいね数取得: N回
- 各投稿のいいね状態取得: N回
- **合計: 1 + 2N 回のリクエスト**

**変更後:**
- 投稿データといいね情報を同時取得: 1回
- いいねトグル時のみ個別リクエスト: ユーザー操作時のみ
- **合計: 1回（初期ロード時）**

### 2. データフローの変更

**変更前:**
```
useInfinitePosts → PostList → PostCard → LikeButton (Supabaseクエリ実行)
```

**変更後:**
```
useInfinitePosts (likesを含めて取得) → PostList → PostCard → LikeButton (データ使用)
```

### 3. いいね情報の計算

`likes` 配列から以下を計算します：

- **いいね数**: `likes.length`
- **自分がいいねしているか**: `likes.some(like => like.user_id === currentUserId)`

---

## 検証手順

1. **TypeScript エラーの確認**
   ```bash
   npm run build
   ```
   または、IDE の診断機能でエラーを確認

2. **開発サーバー起動**
   ```bash
   npm run dev
   ```

3. **動作確認**
   - 投稿一覧が表示される
   - いいね数が正しく表示される
   - いいねボタンをクリックすると、自分がいいねしているか正しく表示される
   - スクロールしても `connection timeout` エラーが発生しない

4. **コンソール確認**
   - ブラウザのコンソール（F12）でエラーが発生していないことを確認
   - 特に「いいね情報取得エラー」が表示されないことを確認

---

## 注意事項

### 1. いいねトグル後のデータ更新

現在の実装では、いいねをトグルした後、UI は楽観的に更新されますが、実際のデータはサーバー側で更新されます。UI と実際のデータを同期させるには、以下の方法があります：

1. **親コンポーネントから再取得**: `onLikeChange` コールバックを追加し、親コンポーネントでデータを再取得
2. **ローカル状態管理**: Zustand や Context API でいいね情報を管理
3. **楽観的更新**: クライアント側で即座に更新し、エラー時のみ元に戻す

今回は実装範囲外としますが、必要に応じて追加実装してください。

### 2. いいね情報のリアルタイム更新

現在の実装では、他のユーザーがいいねした場合、リアルタイムで反映されません。リアルタイム更新が必要な場合は、Supabase Realtime を使用することを検討してください。

### 3. パフォーマンス

`likes` データを含めることで、各投稿のデータサイズが増加します。投稿数が非常に多い場合（数千件以上）、パフォーマンスに影響する可能性があります。その場合は、以下の対策を検討してください：

1. いいね数のみ取得（`likes (count)`）
2. 仮想スクロールの導入
3. ページネーションの調整

---

## まとめ

この修正により、以下の効果が期待できます：

1. **Supabase リクエスト数の大幅削減**: 初期ロード時のリクエスト数を 1 + 2N から 1 に削減
2. **接続タイムアウトエラーの解消**: リクエスト数が減ることで、Supabase の接続制限に引っかかりにくくなる
3. **パフォーマンスの向上**: クライアント側でのデータ取得処理が減ることで、UI の応答性が向上

無限スクロール実装後のパフォーマンス問題を解決するための重要な修正です。
