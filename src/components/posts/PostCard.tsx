import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import type { Database } from "../../types/database.types";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PostWithProfile extends Post {
    profiles: Profile;
}

interface PostCardProps {
    post: PostWithProfile;
    onEdit: (post: PostWithProfile) => void;
    onDelete: (postId: string) => void;
}

export default function PostCard({ post, onEdit, onDelete }: PostCardProps) {
    const { user } = useAuth();
    const [deleting, setDeleting] = useState(false);

    const isOwner = user?.id === post.user_id;
    const displayName = post.profiles.username || post.profiles.handle;
    const initials = displayName[0]?.toUpperCase() ?? "?";

    const handleDelete = async () => {
        if (!confirm("この投稿を削除しますか？")) return;

        setDeleting(true);
        try {
            const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", post.id);

            if (error) throw error;
            onDelete(post.id);
        } catch (error) {
            console.error("投稿削除エラー:", error);
            alert("投稿の削除に失敗しました。");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            {/* ヘッダー（アバター・ユーザー情報） */}
            <div className="flex items-start gap-3">
                {/* アバター */}
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {post.profiles.avatar_url ? (
                        <img 
                            src={post.profiles.avatar_url} 
                            alt={displayName}
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <span className="text-sm font-bold text-blue-600">{initials}</span>
                     )}
                </div>

                {/* 投稿内容 */}
                <div className="flex-1 min-w-0">
                    {/* ユーザー名・handle・日時 */}
                    <div  className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">{displayName}</span>
                        <span className="text-gray-500 text-xs">@{post.profiles.handle}</span>
                        <span className="text-gray-400 text-xs">
                            · {new Date(post.created_at).toLocaleString("ja-JP", {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                            })}
                        </span>
                    </div>

                    {/* 投稿本文 */}
                    <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                        {post.content}
                    </p>

                    {/* アクションボタン（自分の投稿のみ） */}
                    {isOwner && (
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => onEdit(post)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                編集
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-xs text-red-500 hover:text-red-600 font-medium disabled:text-gray-400">
                                {deleting ? '削除中...' : '削除'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}