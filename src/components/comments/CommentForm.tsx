import { useState } from "react";
import type { FormEvent } from "react";
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
                } as any)
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