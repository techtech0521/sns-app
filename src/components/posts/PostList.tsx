import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import PostCard from "./PostCard";
import type { Database } from "../../types/database.types";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PostWithProfile extends Post {
    profiles: Profile;
}

interface PostListProps {
    onEditPost: (post: PostWithProfile) => void;
    refreshTrigger: number;
}

export default function PostList({ onEditPost, refreshTrigger }: PostListProps) {
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 投稿一覧を取得
    const fetchPosts = async () => {
        console.log('[PostList] fetchPosts開始');
        try {
            setLoading(true);
            setError("");

            const { data, error } = await supabase
                .from("posts")
                .select(`
                    *,
                    profiles (*)
                `)
                .order("created_at", { ascending: false })
                .limit(50);

            console.log('[PostList] fetchPosts結果', { 
                count: data?.length, 
                error,
                firstPost: data?.[0] ? (data[0] as any).content?.substring(0, 20) : null
            });

            if (error) throw error;
            setPosts(data as PostWithProfile[]);
        } catch (err) {
            console.error('[PostList] fetchPostsエラー:', err);
            setError("投稿の読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // 初回読み込みと更新トリガー
    useEffect(() => {
        console.log('[PostList] useEffect: refreshTrigger=', refreshTrigger);
        fetchPosts();
    }, [refreshTrigger]);

    // 投稿削除時の処理
    const handleDelete = (postId: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    if (loading) {
        return (
            <div className="text-center py-12 text-gray-400">
                読み込み中...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-3">{error}</p>
                <button
                    onClick={fetchPosts}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    再読み込み
                </button>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                まだ投稿がありません
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onEdit={onEditPost}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
}