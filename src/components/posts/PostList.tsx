import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import PostCard from "./PostCard";
import type { Database } from "../../types/database.types";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PostWithProfile extends Post {
    profiles: Profile;
}

interface PostListProps {
    onEditPost: (post: PostWithProfile) => void;
    refreshTrigger?: number;
    filterType?: "all" | "following";
}

export default function PostList({ onEditPost, refreshTrigger = 0, filterType = "all" }: PostListProps) {
    const { user } = useAuth()
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 投稿一覧を取得
    const fetchPosts = async () => {
        try {
            setLoading(true);
            setError("");

            if (filterType === "following") {
                // フォロー中のユーザーの投稿のみ取得
                await fetchFollowingPosts();
            } else {
                // 全体の投稿を取得
                await fetchAllPosts();
            }
        } catch (err) {
            console.error('投稿取得エラー:', err);
            setError("投稿の読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    };

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

    const fetchFollowingPosts = async () => {
        if (!user) {
            setPosts([]);
            return;
        }

        // フォローしているユーザーのIDを取得
        const { data: follows, error: followsError } = await supabase
            .from("follows")
            .select("following_id")
            .eq("following_id", user.id);

        if (followsError) throw followsError;

        // 型アサーションを使用して型エラーを回避
        const followingIds = (follows as any)?.map((f: any) => f.following_id) || [];

        // フォローしているユーザーがいない場合
        if (followingIds.length === 0) {
            setPosts([]);
            return;
        }

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
    };

    // 初回読み込みと更新トリガー
    useEffect(() => {
        fetchPosts();
    }, [refreshTrigger, filterType]);

    // 投稿削除時の処理
    const handleDelete = (postId: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-400">読み込み中...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">{error}</div>;
    }

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