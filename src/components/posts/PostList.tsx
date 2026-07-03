import { useInfinitePosts } from "../../hooks/useInfinitePosts";
import { useAuth } from "../../contexts/AuthContext";
import PostCard from "./PostCard";
import type { Database } from "../../types/database.types";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PostWithProfile extends Post {
    profiles: Profile;
    comments?: { id: string }[];
}

interface PostListProps {
    onEditPost: (post: PostWithProfile) => void;
    refreshTrigger?: number;
    filterType?: "all" | "following";
}

export default function PostList({ onEditPost, refreshTrigger = 0, filterType = "all" }: PostListProps) {
    const { user } = useAuth();
    const {
        posts,
        loading,
        loadingMore,
        hasMore,
        observerRef,
        error,
    } = useInfinitePosts(filterType, refreshTrigger);

    // 投稿削除時の処理
    const handleDelete = (_postId: string) => {
        // 削除済みとして投稿をフィルタリング
        // * 実際の削除処理は PostCard 内で行われる
    };

    // 初回ロード中
    if (loading) {
        return <div className="text-center py-8 text-gray-400">読み込み中...</div>;
    }

    // エラー表示
    if (error) {
        return <div className="text-center py-8 text-red-500">{error}</div>;
    }

    // 投稿がない場合
    if (posts.length === 0) {
        if (filterType === "following") {
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
                <p className="text-gray-400 text-sm">
                    まだ投稿がありません
                </p>
                <p className="text-gray-400 text-xs mt-1">
                    最初の投稿をしてみましょう！
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map((post, index) => {
                // 最後から1番目の要素にobserverRefをアタッチ
                const isObserverTarget = index === posts.length - 1;

                return (
                    <div key={post.id} ref={isObserverTarget ? observerRef : undefined}>
                        <PostCard
                            post={post}
                            onEdit={onEditPost}
                            onDelete={handleDelete}
                            currentUserId={user?.id}
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