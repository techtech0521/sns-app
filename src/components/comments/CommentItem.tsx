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