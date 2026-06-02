# コメント機能実装計画書

## 1. データベース設計（Supabase）

### 1.1. commentsテーブルの作成

**SQL:**
```sql
-- commentsテーブルの作成
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- RLS（Row Level Security）ポリシーの設定
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 読み取り：誰でもコメントを閲覧可能
CREATE POLICY "Comments are viewable by everyone"
    ON comments FOR SELECT
    USING (true);

-- 挿入：認証済みユーザーのみコメント投稿可能
CREATE POLICY "Authenticated users can insert comments"
    ON comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 更新：コメント投稿者のみ編集可能
CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id);

-- 削除：コメント投稿者のみ削除可能
CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);
```

---

## 2. 型定義の更新

### 2.1. ファイル: `src/types/database.types.ts`

**修正内容:** `Database` インターフェースに `comments` テーブル定義を追加

**追加位置:** `follows` テーブル定義の後（101行目の後）

**追加コード:**
```typescript
comments: {
  Row: {
    id: string
    post_id: string
    user_id: string
    content: string
    created_at: string
  }
  Insert: {
    id?: string
    post_id: string
    user_id: string
    content: string
    created_at?: string
  }
  Update: {
    id?: string
    post_id?: string
    user_id?: string
    content?: string
    created_at?: string
  }
}
```

---

## 3. 新規コンポーネント作成

### 3.1. ファイル: `src/components/comments/CommentForm.tsx`

**新規作成 - 完全コード:**

```typescript
import { useState, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { validateCommentContent } from "../../utils/validation";
import { checkRateLimit, getRateLimitMessage } from "../../utils/rateLimit";

interface CommentFormProps {
    postId: string;
    onCommentCreated: () => void;
}

export default function CommentForm({ postId, onCommentCreated }: CommentFormProps) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const maxLength = 140;
    const remaining = maxLength - content.length;

    if (!user) {
        return (
            <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-red-500 text-sm">ログインしてください</p>
            </div>
        );
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // バリデーション
        const validation = validateCommentContent(content);
        if (!validation.valid) {
            setError(validation.error ?? "");
            return;
        }

        // レート制限チェック
        const rateLimit = checkRateLimit("comment_create");
        if (!rateLimit.allowed) {
            setError(getRateLimitMessage("comment_create", rateLimit.resetIn!));
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const { error: insertError } = await supabase
                .from("comments")
                .insert({
                    post_id: postId,
                    user_id: user.id,
                    content: content.trim(),
                })
                .select();

            if (insertError) throw insertError;

            setContent("");
            onCommentCreated();
        } catch (err: any) {
            console.error("コメント投稿エラー:", err);
            setError(`コメントの投稿に失敗しました: ${err.message || '不明なエラー'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-4">
            <textarea
                value={content}
                onChange={(e) => {
                    setContent(e.target.value);
                    setError("");
                }}
                placeholder="コメントを追加..."
                rows={2}
                maxLength={maxLength}
                className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={submitting}
            />
            <div className="flex items-center justify-between mt-2">
                <span
                    className={`text-xs ${
                        remaining < 0
                            ? "text-red-500 font-bold"
                            : remaining < 20
                            ? "text-orange-500"
                            : "text-gray-400"
                    }`}
                >
                    残り {remaining} 文字
                </span>
                <button
                    type="submit"
                    disabled={submitting || content.trim().length === 0 || remaining < 0}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {submitting ? "送信中..." : "コメント"}
                </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </form>
    );
}
```

---

### 3.2. ファイル: `src/components/comments/CommentItem.tsx`

**新規作成 - 完全コード:**

```typescript
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { sanitizeCommentContent } from "../../utils/sanitizer";
import type { Database } from "../../types/database.types";

type Comment = Database["public"]["Tables"]["comments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface CommentWithProfile extends Comment {
    profiles: Profile;
}

interface CommentItemProps {
    comment: CommentWithProfile;
    onDelete: (commentId: string) => void;
}

export default function CommentItem({ comment, onDelete }: CommentItemProps) {
    const { user } = useAuth();
    const [deleting, setDeleting] = useState(false);

    const isOwner = user?.id === comment.user_id;
    const displayName = comment.profiles.username || comment.profiles.handle;
    const initials = displayName[0]?.toUpperCase() ?? "?";

    const handleDelete = async () => {
        if (!confirm("このコメントを削除しますか？")) return;

        setDeleting(true);
        try {
            const { error } = await supabase
                .from("comments")
                .delete()
                .eq("id", comment.id);

            if (error) throw error;
            onDelete(comment.id);
        } catch (error) {
            console.error("コメント削除エラー:", error);
            alert("コメントの削除に失敗しました。");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex items-start gap-2 py-2">
            {/* アバター */}
            <Link
                to={`/users/${comment.profiles.handle}`}
                className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
            >
                {comment.profiles.avatar_url ? (
                    <img
                        src={comment.profiles.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-xs font-bold text-blue-600">{initials}</span>
                )}
            </Link>

            {/* コメント内容 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <Link
                        to={`/users/${comment.profiles.handle}`}
                        className="font-semibold text-gray-900 text-sm hover:underline"
                    >
                        {displayName}
                    </Link>
                    <span className="text-gray-400 text-xs">
                        {new Date(comment.created_at).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                </div>
                <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                    {sanitizeCommentContent(comment.content)}
                </p>
            </div>

            {/* 削除ボタン（投稿者のみ） */}
            {isOwner && (
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-gray-400 hover:text-red-600 text-xs disabled:opacity-50"
                >
                    {deleting ? "削除中..." : "削除"}
                </button>
            )}
        </div>
    );
}
```

---

### 3.3. ファイル: `src/components/comments/CommentList.tsx`

**新規作成 - 完全コード:**

```typescript
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import type { Database } from "../../types/database.types";

type Comment = Database["public"]["Tables"]["comments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface CommentWithProfile extends Comment {
    profiles: Profile;
}

interface CommentListProps {
    postId: string;
    isOpen: boolean;
}

export default function CommentList({ postId, isOpen }: CommentListProps) {
    const [comments, setComments] = useState<CommentWithProfile[]>([]);
    const [loading, setLoading] = useState(false);

    // コメント一覧を取得
    const fetchComments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("comments")
                .select(`
                    *,
                    profiles (*)
                `)
                .eq("post_id", postId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setComments(data as CommentWithProfile[]);
        } catch (err) {
            console.error("コメント取得エラー:", err);
        } finally {
            setLoading(false);
        }
    };

    // 投稿が開かれたとき、またはコメント作成後に取得
    useEffect(() => {
        if (isOpen) {
            fetchComments();
        }
    }, [postId, isOpen]);

    // コメント削除時の処理
    const handleDelete = (commentId: string) => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    if (!isOpen) return null;

    return (
        <div className="bg-gray-50 rounded-lg p-3">
            <CommentForm postId={postId} onCommentCreated={fetchComments} />

            {loading ? (
                <p className="text-center text-gray-400 text-sm py-4">読み込み中...</p>
            ) : comments.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">
                    まだコメントがありません
                </p>
            ) : (
                <div className="space-y-1">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
```

---

## 4. 既存ファイルの修正

### 4.1. ファイル: `src/components/posts/PostCard.tsx`

**修正内容:**

**追加1: インポート追加（5行目の後、既存の `import { useState }` の後に追加）**
```typescript
import CommentList from '../comments/CommentList';
```

**追加2: State追加（24行目、`const [deleting, setDeleting] = useState(false);` の後）**
```typescript
const [showComments, setShowComments] = useState(false);
```

**追加3: アクションボタンエリアにコメントボタン追加（114行目、`<LikeButton postId={post.id} />` の後）**
```typescript
<button
    onClick={() => setShowComments(!showComments)}
    className="text-xs text-gray-500 hover:text-blue-600 font-medium flex items-center gap-1"
>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    コメント
</button>
```

**追加4: コメントリスト追加（133行目の `</div>` の後に、最後の `</div>` の前に追加）**
```typescript
{showComments && (
    <div className="mt-4 pt-4 border-t border-gray-100">
        <CommentList postId={post.id} isOpen={showComments} />
    </div>
)}
```

---

### 4.2. ファイル: `src/utils/validation.ts`

**修正内容:** コメント用バリデーション関数追加

**追加位置:** ファイルの末尾（69行目の後）

**追加コード:**
```typescript
// コメント内容のバリデーション
export const validateCommentContent = (content: string): { valid: boolean; error?: string } => {
    const trimmed = content.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'コメントを入力してください' };
    }

    if (trimmed.length > 140) {
        return { valid: false, error: 'コメントは140文字以内で入力してください' };
    }

    return { valid: true };
};
```

---

### 4.3. ファイル: `src/utils/sanitizer.ts`

**修正内容:** コメント用サニタイズ関数追加（投稿のものを再利用）

**追加位置:** ファイルの末尾（42行目の後）

**追加コード:**
```typescript
/**
 * コメント内容をサニタイズ（XSS対策）
 */
export function sanitizeCommentContent(content: string): string {
    return sanitizeHtml(content);
}
```

---

### 4.4. ファイル: `src/utils/rateLimit.ts`

**修正内容:** コメント投稿のレート制限設定追加

**修正1: `RATE_LIMITS` オブジェクトに追加（11〜15行目）**
```typescript
const RATE_LIMITS: Record<string, RateLimitConfig> = {
    post_create: { maxAttempts: 10, windowMs: 60000 },   // 1分間に10投稿まで
    like_toggle: { maxAttempts: 30, windowMs: 60000 },   // 1分間に30いいねまで
    follow_toggle: { maxAttempts: 20, windowMs: 60000 }, // 1分間に20フォローまで
    comment_create: { maxAttempts: 10, windowMs: 60000 }, // 1分間に10コメントまで
};
```

**修正2: `getRateLimitMessage` 関数の `messages` オブジェクトに追加（87〜93行目）**
```typescript
const messages: Record<string, string> = {
    post_create: `投稿の制限に達しました。${resetIn}秒後に再試行してください。`,
    like_toggle: `いいねの制限に達しました。${resetIn}秒後に再試行してください。`,
    follow_toggle: `フォローの制限に達しました。${resetIn}秒後に再試行してください。`,
    comment_create: `コメントの制限に達しました。${resetIn}秒後に再試行してください。`,
};
```

---

## 5. 実装手順

1. Supabaseでcommentsテーブルを作成（SQL実行）
2. `src/types/database.types.ts` に型定義を追加
3. `src/utils/validation.ts` にコメントバリデーション追加
4. `src/utils/sanitizer.ts` にコメントサニタイズ追加
5. `src/utils/rateLimit.ts` にレート制限追加
6. `src/components/comments/CommentForm.tsx` を新規作成
7. `src/components/comments/CommentItem.tsx` を新規作成
8. `src/components/comments/CommentList.tsx` を新規作成
9. `src/components/posts/PostCard.tsx` にコメント機能を統合

---

## 6. テスト計画

### 6.1. E2Eテスト（Playwright）

**新規ファイル: `tests/comments.spec.ts`**

テスト内容：
1. コメント欄の開閉動作
2. コメントの投稿（正常系）
3. 空コメントの投稿禁止（異常系）
4. 文字数制限（140文字）
5. コメントの削除（投稿者のみ）
6. コメントなしメッセージの表示
7. 複数コメントの表示
8. XSS対策の確認
9. 他人のコメント削除不可
10. レート制限の動作

### 6.2. テスト実行方法

```bash
# テスト実行
npm run test

# 特定のテストファイルのみ実行
npx playwright test tests/comments.spec.ts

# ヘッドレスモードで実行
npx playwright test --headed
```

---

## 7. セキュリティ対策

- **XSS対策:** サニタイズ関数を適用
- **レート制限:** 1分間に10回のコメント投稿制限
- **RLS:** 認証済みユーザーのみ投稿、投稿者のみ削除可能
- **CASCADE削除:** 投稿削除時にコメントも自動削除
