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
    onCommentCountChange?: (count: number) => void;
}

export default function CommentList({ postId, isOpen, onCommentCountChange }: CommentListProps) {
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

            // コメント数が変更されたことを通知
            if (onCommentCountChange) {
                onCommentCountChange(data?.length ?? 0);
            }
        } catch (error) {
            console.error("コメント取得エラー:", error);
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
        setComments((prev) => {
            const newComments = prev.filter((c) => c.id !== commentId);
            // コメント数が変更されたことを通知
            if (onCommentCountChange) {
                onCommentCountChange(newComments.length);
            }
            return newComments;
        });
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