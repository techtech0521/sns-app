# コメント数表示機能実装計画

## コンテキスト

コメント機能の実装が完了したため、ユーザーがコメント数表示機能の実装を希望しています。

## ユーザー要件

- **表示場所**: コメントボタン内（「💬 数値」のように）
- **0件の表示**: 数値を表示

## 実装内容

### 1. ファイル: `src/components/posts/PostList.tsx`

#### 1.1. 型定義の更新（10-14行目）

**修正前:**
```typescript
interface PostWithProfile extends Post {
    profiles: Profile;
}
```

**修正後:**
```typescript
interface PostWithProfile extends Post {
    profiles: Profile;
    comments?: { id: string }[];
}
```

#### 1.2. `fetchAllPosts` 関数の修正（47-59行目）

**修正前:**
```typescript
const fetchAllPosts = async () => {
    const { data, error } = await supabase
        .from("posts")
        .select(`
            *,
            profiles (*)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) throw error;
    setPosts(data as PostWithProfile[]);
}
```

**修正後:**
```typescript
const fetchAllPosts = async () => {
    const { data, error } = await supabase
        .from("posts")
        .select(`
            *,
            profiles (*),
            comments (id)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) throw error;
    setPosts(data as PostWithProfile[]);
}
```

#### 1.3. `fetchFollowingPosts` 関数の修正（85-95行目）

**修正前:**
```typescript
// フォローしているユーザーの投稿を取得
const { data, error } = await supabase
    .from("posts")
    .select(`
        *,
        profiles (*)
    `)
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(50);

if (error) throw error;
setPosts(data as PostWithProfile[]);
```

**修正後:**
```typescript
// フォローしているユーザーの投稿を取得
const { data, error } = await supabase
    .from("posts")
    .select(`
        *,
        profiles (*),
        comments (id)
    `)
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(50);

if (error) throw error;
setPosts(data as PostWithProfile[]);
```

---

### 2. ファイル: `src/components/posts/PostCard.tsx`

#### 2.1. PostWithProfile インターフェースの拡張（13-16行目）

**修正前:**
```typescript
interface PostWithProfile extends Post {
    profiles: Profile;
}
```

**修正後:**
```typescript
interface PostWithProfile extends Post {
    profiles: Profile;
    comments?: { id: string }[];
}
```

#### 2.2. Stateの追加（26-28行目）

**修正前:**
```typescript
const { user } = useAuth();
const [deleting, setDeleting] = useState(false);
const [showComments, setShowComments] = useState(false);
```

**修正後:**
```typescript
const { user } = useAuth();
const [deleting, setDeleting] = useState(false);
const [showComments, setShowComments] = useState(false);
const [commentCount, setCommentCount] = useState(post.comments?.length ?? 0);
```

#### 2.3. コメント数更新ハンドラーの追加（34-36行目）

**追加コード:**
```typescript
const handleCommentCountChange = (newCount: number) => {
    setCommentCount(newCount);
};
```

#### 2.4. コメントボタンの更新（123-131行目）

**修正前:**
```tsx
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

**修正後:**
```tsx
<button
    onClick={() => setShowComments(!showComments)}
    className="text-xs text-gray-500 hover:text-blue-600 font-medium flex items-center gap-1"
>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    {commentCount}
</button>
```

#### 2.5. CommentListへのコールバック渡し（153-159行目）

**修正前:**
```tsx
{showComments && (
    <div className="mt-4 pt-4 border-t border-gray-100">
        <CommentList postId={post.id} isOpen={showComments} />
    </div>
)}
```

**修正後:**
```tsx
{showComments && (
    <div className="mt-4 pt-4 border-t border-gray-100">
        <CommentList 
            postId={post.id} 
            isOpen={showComments} 
            onCommentCountChange={handleCommentCountChange}
        />
    </div>
)}
```

---

### 3. ファイル: `src/components/comments/CommentList.tsx`

#### 3.1. CommentListProps の更新（14-18行目）

**修正前:**
```typescript
interface CommentListProps {
    postId: string;
    isOpen: boolean;
}
```

**修正後:**
```typescript
interface CommentListProps {
    postId: string;
    isOpen: boolean;
    onCommentCountChange?: (count: number) => void;
}
```

#### 3.2. 関数引数の更新（20行目）

**修正前:**
```typescript
export default function CommentList({ postId, isOpen }: CommentListProps) {
```

**修正後:**
```typescript
export default function CommentList({ postId, isOpen, onCommentCountChange }: CommentListProps) {
```

#### 3.3. コメント取得後にコールバックを実行（37-43行目）

**修正前:**
```typescript
if (error) throw error;
setComments(data as CommentWithProfile[]);
```

**修正後:**
```typescript
if (error) throw error;
setComments(data as CommentWithProfile[]);

// コメント数が変更されたことを通知
if (onCommentCountChange) {
    onCommentCountChange(data?.length ?? 0);
}
```

#### 3.4. コメント削除後にコールバックを実行（59-68行目）

**修正前:**
```typescript
// コメント削除時の処理
const handleDelete = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
};
```

**修正後:**
```typescript
// コメント削除時の処理
const handleDelete = (commentId: string) => {
    setComments((prev) => {
        const newComments = prev.filter((c) => c.id !== commentId);
        // コメント数が変更されたことを通知
        if (onCommentCountChange) {
            onCommentCountChange(newComments.length);
        }
        return newComments;
    });
};
```

---

## 実装完了

✅ **完了した作業:**
1. `src/components/posts/PostList.tsx` - コメント数を含めた投稿取得
2. `src/components/posts/PostCard.tsx` - コメント数表示とState管理
3. `src/components/comments/CommentList.tsx` - コメント数変更通知

---

## 変更ファイル一覧

1. `src/components/posts/PostList.tsx`
2. `src/components/posts/PostCard.tsx`
3. `src/components/comments/CommentList.tsx`

---

## 技術的注意点

1. **Supabaseクエリ**: `comments (id)` でコメント数を効率的に取得
2. **React状態更新**: `setComments` は非同期であるため、直後の `comments.length` は古い値を参照
3. **解決策**: `data?.length ?? 0` を使用して正しいコメント数を取得
4. **型定義統一**: `PostWithProfile` の `comments` 型を `{ id: string }[]` に統一
