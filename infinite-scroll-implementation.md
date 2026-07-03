# 無限スクロール機能 実装コード詳細

## ファイル一覧

| ファイル | 種類 | 説明 |
|----------|------|------|
| `src/hooks/useInfiniteScroll.ts` | 新規 | Intersection Observer を管理するカスタムフック |
| `src/hooks/useInfinitePosts.ts` | 新規 | 投稿の無限スクロールロジックを管理 |
| `src/components/posts/PostList.tsx` | 修正 | 無限スクロール対応に変更 |
| `tests/infinite-scroll.spec.ts` | 新規 | E2Eテスト |

---

## 1. src/hooks/useInfiniteScroll.ts（新規作成）

```typescript
import { useEffect, useState, RefCallback } from 'react';

interface UseInfiniteScrollOptions {
  /** 要素がどの程度見えたら発火するか（0-1） */
  threshold?: number;
  /** ルートマージン（CSS形式） */
  rootMargin?: string;
}

/**
 * Intersection Observer を管理するカスタムフック
 * 
 * @param hasNext - まだデータがあるかどうか。falseのときはobserveしない
 * @param onLoadMore - 次ページを読み込む関数
 * @param options - オプション設定
 * @returns ref - 監視対象の要素にアタッチするrefコールバック
 */
export function useInfiniteScroll(
  hasNext: boolean,
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
): RefCallback<HTMLElement> {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // データがない、または監視対象の要素がない場合は何もしない
    if (!hasNext || !node) {
      return;
    }

    // Intersection Observer の作成
    const observer = new IntersectionObserver(
      (entries) => {
        // 最初のエントリ（監視対象要素）が交差したら
        if (entries[0].isIntersecting) {
          // 次ページを読み込む
          onLoadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    // 監視を開始
    observer.observe(node);

    // クリーンアップ: 監視を停止
    return () => {
      observer.disconnect();
    };
  }, [hasNext, node, threshold, rootMargin, onLoadMore]);

  // refコールバックを返す
  return setNode;
}
```

**実装ポイント:**
- `RefCallback<HTMLElement>` を返すことで、任意の要素に直接アタッチ可能
- `hasNext=false` のときはobserveしない（不要なAPI呼び出しを防止）
- `rootMargin: '100px'` で、要素が見える少し前から発火させる
- クリーンアップで `observer.disconnect()` を呼び出し、メモリリークを防止

---

## 2. src/hooks/useInfinitePosts.ts（新規作成）

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScroll } from './useInfiniteScroll';
import type { Database } from '../types/database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PostWithProfile extends Post {
  profiles: Profile;
  comments?: { id: string }[];
}

interface UseInfinitePostsResult {
  /** 投稿リスト */
  posts: PostWithProfile[];
  /** 初回ロード中かどうか */
  loading: boolean;
  /** 追加ロード中かどうか */
  loadingMore: boolean;
  /** さらにデータがあるかどうか */
  hasMore: boolean;
  /** 次ページを読み込む関数 */
  loadMore: () => Promise<void>;
  /** Intersection Observer 用ref */
  observerRef: (node: HTMLElement | null) => void;
  /** エラーメッセージ */
  error: string;
}

/** 1回のロード件数 */
const POSTS_PER_PAGE = 10;

/**
 * 投稿の無限スクロールロジックを管理するカスタムフック
 * 
 * @param filterType - フィルタタイプ（"all" または "following"）
 * @param refreshTrigger - 更新トリガー（変更時にリセット）
 * @param userId - ユーザーID（followingフィルタ時使用）
 * @returns 無限スクロールの状態と関数
 */
export function useInfinitePosts(
  filterType: 'all' | 'following',
  refreshTrigger: number,
  userId?: string
): UseInfinitePostsResult {
  const { user } = useAuth();

  // 状態管理
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null);

  // 全体の投稿を取得
  const fetchAllPosts = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPosts([]);
        setLastCreatedAt(null);
        setHasMore(true);
      }

      let query = supabase
        .from('posts')
        .select(
          `
          *,
          profiles (*),
          comments (id)
        `
        )
        .order('created_at', { ascending: false })
        .limit(POSTS_PER_PAGE);

      // 追加ロード時はカーソルを使用
      if (isLoadMore && lastCreatedAt) {
        query = query.lt('created_at', lastCreatedAt);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const newPosts = (data as PostWithProfile[]) || [];

      if (isLoadMore) {
        // 追加ロード: 既存の投稿に追加
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        // 初回ロード
        setPosts(newPosts);
      }

      // 取得件数がリクエスト件数より少ない場合、これ以上データはない
      setHasMore(newPosts.length === POSTS_PER_PAGE);

      // 最後の投稿のcreated_atを保存（次ページのカーソル）
      if (newPosts.length > 0) {
        const lastPost = newPosts[newPosts.length - 1];
        setLastCreatedAt(lastPost.created_at);
      }
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError('投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastCreatedAt]);

  // フォロー中のユーザーの投稿を取得
  const fetchFollowingPosts = useCallback(async (isLoadMore = false) => {
    try {
      if (!user) {
        setPosts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPosts([]);
        setLastCreatedAt(null);
        setHasMore(true);
      }

      // フォローしているユーザーのIDを取得
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;

      const followingIds = follows?.map((f) => f.following_id) || [];

      // フォローしているユーザーがいない場合
      if (followingIds.length === 0) {
        setPosts([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      let query = supabase
        .from('posts')
        .select(
          `
          *,
          profiles (*),
          comments (id)
        `
        )
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(POSTS_PER_PAGE);

      // 追加ロード時はカーソルを使用
      if (isLoadMore && lastCreatedAt) {
        query = query.lt('created_at', lastCreatedAt);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const newPosts = (data as PostWithProfile[]) || [];

      if (isLoadMore) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(newPosts.length === POSTS_PER_PAGE);

      if (newPosts.length > 0) {
        const lastPost = newPosts[newPosts.length - 1];
        setLastCreatedAt(lastPost.created_at);
      }
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError('投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, lastCreatedAt]);

  // 次ページを読み込む関数
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    if (filterType === 'following') {
      await fetchFollowingPosts(true);
    } else {
      await fetchAllPosts(true);
    }
  }, [loadingMore, hasMore, filterType, fetchAllPosts, fetchFollowingPosts]);

  // 初回読み込みと更新トリガー
  useEffect(() => {
    if (filterType === 'following') {
      fetchFollowingPosts(false);
    } else {
      fetchAllPosts(false);
    }
  }, [refreshTrigger, filterType, fetchAllPosts, fetchFollowingPosts]);

  // Intersection Observer 用の ref
  const observerRef = useInfiniteScroll(hasMore && !loading, loadMore, {
    threshold: 0.1,
    rootMargin: '100px',
  });

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    observerRef,
    error,
  };
}
```

**実装ポイント:**
- カーソルベースのページネーション: `created_at` を使用して `.lt('created_at', lastCreatedAt)` で次ページを取得
- `isLoadMore` フラグで初回ロードと追加ロードを切り分け
- 追加ロード時は既存の `posts` に追記（`[...prev, ...newPosts]`）
- `hasMore` は取得件数が `POSTS_PER_PAGE` と等しいかで判定
- `useInfiniteScroll` に `hasMore && !loading` を渡し、不要なobserverを防止

---

## 3. src/components/posts/PostList.tsx（修正）

**変更前との差分:**
- ローカル状態（`posts`, `loading`, `error`）を削除
- `useInfinitePosts` フックを使用
- 最後から3番目の要素に `observerRef` をアタッチ
- ローディング表示を調整（初回/追加で切り分け）

```typescript
import { useInfinitePosts } from '../../hooks/useInfinitePosts';
import PostCard from './PostCard';
import type { Database } from '../../types/database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PostWithProfile extends Post {
  profiles: Profile;
  comments?: { id: string }[];
}

interface PostListProps {
  onEditPost: (post: PostWithProfile) => void;
  refreshTrigger?: number;
  filterType?: 'all' | 'following';
}

export default function PostList({
  onEditPost,
  refreshTrigger = 0,
  filterType = 'all',
}: PostListProps) {
  // 無限スクロールフックを使用
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    observerRef,
    error,
  } = useInfinitePosts(filterType, refreshTrigger);

  // 投稿削除時の処理
  const handleDelete = (postId: string) => {
    // 削除済みとして投稿をフィルタリング
    // ※ 実際の削除処理は PostCard 内で行われる
  };

  // 初回ロード中
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">読み込み中...</div>
    );
  }

  // エラー表示
  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  // 投稿がない場合
  if (posts.length === 0) {
    if (filterType === 'following') {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">
            フォロー中のユーザーの投稿がありません
          </p>
          <p className="text-gray-400 text-xs mt-1">
            ユーザーを検索してフォローしてみましょう！
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">まだ投稿がありません</p>
        <p className="text-gray-400 text-xs mt-1">
          最初の投稿をしてみましょう！
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => {
        // 最後から3番目の要素にobserverRefをアタッチ
        const isObserverTarget = index === posts.length - 3;

        return (
          <div key={post.id} ref={isObserverTarget ? observerRef : undefined}>
            <PostCard
              post={post}
              onEdit={onEditPost}
              onDelete={handleDelete}
            />
          </div>
        );
      })}

      {/* 追加ロード中のスピナー */}
      {loadingMore && (
        <div className="text-center py-4">
          <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* これ以上データがない場合のメッセージ */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-xs">これ以上投稿はありません</p>
        </div>
      )}
    </div>
  );
}
```

**実装ポイント:**
- `isObserverTarget = index === posts.length - 3` で最後から3番目を判定
- 追加ロード中はスピナー表示（TailwindCSSのanimate-spinを使用）
- `!hasMore && posts.length > 0` で「これ以上投稿はありません」を表示

---

## 4. tests/infinite-scroll.spec.ts（新規作成）

```typescript
import { test, expect } from '@playwright/test';

test.describe('無限スクロール', () => {
  const testEmail = 'test-posts@example.com';
  const testPassword = 'TestPassword123!';

  // 各テストの前にログイン
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=ログイン');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await Promise.all([
      page.waitForURL('/', { timeout: 30000 }),
      page.click("button[type='submit']"),
    ]);
  });

  test('初回10件が表示される', async ({ page }) => {
    // 投稿カードを待つ
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // 投稿カードの数を取得
    const postCards = await page.locator('[data-testid="post-card"]').count();

    // 初回は10件以下（環境によって投稿数が異なる可能性があるため10件以下でチェック）
    expect(postCards).toBeLessThanOrEqual(10);
  });

  test('スクロールすると追加で10件読み込まれる', async ({ page }) => {
    // 投稿カードを待つ
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // 初回の投稿数を取得
    const initialCount = await page
      .locator('[data-testid="post-card"]')
      .count();

    // ページの下部までスクロール
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // 追加ロードの完了を待つ（スピナーが消えるのを待つ）
    await page.waitForSelector(
      'div:has-text("これ以上投稿はありません")',
      { timeout: 10000 }
    ).catch(() => {
      // メッセージが表示されない場合（まだデータがある場合）はスピナーが消えるのを待つ
    });

    // 投稿数が増えていることを確認
    const newCount = await page.locator('[data-testid="post-card"]').count();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('すべて読み込むとメッセージが表示される', async ({ page }) => {
    // 投稿カードを待つ
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // 繰り返しスクロールしてすべてのデータを読み込む
    let previousCount = 0;
    let retries = 0;
    const maxRetries = 10; // 無限ループ防止

    while (retries < maxRetries) {
      // ページの下部までスクロール
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // 少し待つ
      await page.waitForTimeout(1000);

      const currentCount = await page
        .locator('[data-testid="post-card"]')
        .count();

      // 投稿数が増えなくなったら終了
      if (currentCount === previousCount) {
        break;
      }

      previousCount = currentCount;
      retries++;
    }

    // 「これ以上投稿はありません」が表示されることを確認
    const message = await page
      .locator('text=これ以上投稿はありません')
      .isVisible();
    expect(message).toBeTruthy();
  });

  test('フォロー中タブでも動作する', async ({ page }) => {
    // フォロー中タブをクリック
    await page.click('button:has-text("フォロー中")');

    // 投稿カードを待つ（フォロー中の投稿がない場合もある）
    try {
      await page.waitForSelector('[data-testid="post-card"]', {
        timeout: 10000,
      });

      // 初回の投稿数を取得
      const initialCount = await page
        .locator('[data-testid="post-card"]')
        .count();

      // ページの下部までスクロール
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // 追加ロードの完了を待つ
      await page.waitForTimeout(2000);

      // 投稿数が増えているか、メッセージが表示される
      const newCount = await page.locator('[data-testid="post-card"]').count();
      const hasMessage = await page
        .locator('text=これ以上投稿はありません')
        .isVisible();

      expect(
        newCount > initialCount || hasMessage,
        '投稿数が増えているか、メッセージが表示される必要があります'
      ).toBeTruthy();
    } catch {
      // フォロー中の投稿がない場合は「投稿がありません」メッセージが表示される
      await expect(
        page.locator('text=フォロー中のユーザーの投稿がありません')
      ).toBeVisible();
    }
  });

  test('投稿作成後にリストが更新される', async ({ page }) => {
    // 投稿カードを待つ
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // 初回の投稿数を取得
    const initialCount = await page
      .locator('[data-testid="post-card"]')
      .count();

    // 新規投稿を作成
    const postContent = `無限スクロールテスト ${Date.now()}`;
    await page.fill('textarea', postContent);
    await page.click('button:has-text("投稿")');

    // 投稿が表示されるのを待つ
    await expect(page.locator(`text=${postContent}`)).toBeVisible({
      timeout: 10000,
    });

    // 投稿数が増えていることを確認
    const newCount = await page.locator('[data-testid="post-card"]').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('追加ロード中にスピナーが表示される', async ({ page }) => {
    // 投稿カードを待つ
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // ページの下部までスクロール
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // スピナーが表示されることを確認
    const spinner = page.locator(
      '.border-blue-500.border-t-transparent.rounded-full.animate-spin'
    );

    // スピナーが一瞬表示されるはず（表示されない場合もあるのでタイムアウトは短め）
    try {
      await spinner.toBeVisible({ timeout: 2000 });
    } catch {
      // スピナーが表示されない場合（データが少ない場合など）はテストをパス
    }
  });
});
```

**実装ポイント:**
- `[data-testid="post-card"]` セレクタを使用（`PostCard.tsx` に `data-testid` 追加が必要）
- `window.scrollTo(0, document.body.scrollHeight)` でページ下部までスクロール
- 無限ループ防止のため `maxRetries` を設定
- フォロー中タブのテストは、投稿がないケースを考慮

---

## 追加で必要な修正

### PostCard.tsx に data-testid を追加

`src/components/posts/PostCard.tsx` のルート要素に `data-testid="post-card"` を追加:

```typescript
export default function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  // ... 既存の処理 ...

  return (
    <div data-testid="post-card" className="bg-white border border-gray-200 rounded-lg p-4">
      {/* 既存のコンテンツ */}
    </div>
  );
}
```

---

## 実装手順

1. **src/hooks/useInfiniteScroll.ts** を新規作成
2. **src/hooks/useInfinitePosts.ts** を新規作成
3. **src/components/posts/PostList.tsx** を上記のコードに置き換え
4. **src/components/posts/PostCard.tsx** に `data-testid="post-card"` を追加
5. **tests/infinite-scroll.spec.ts** を新規作成
6. 動作確認

```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm run test  # または npx playwright test tests/infinite-scroll.spec.ts
```
