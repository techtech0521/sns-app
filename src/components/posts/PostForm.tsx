import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { validatePostContent } from "../../utils/validation";
import { checkRateLimit, getRateLimitMessage } from "../../utils/rateLimit";
import type { Database } from "../../types/database.types";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PostWithProfile extends Post {
    profiles: Profile;
}

interface PostFormProps {
    editingPost?: PostWithProfile | null;
    onPostCreated: () => void;
    onPostUpdated: () => void;
    onCancelEdit: () => void;
}

export default function PostForm({ editingPost, onPostCreated, onPostUpdated, onCancelEdit }: PostFormProps) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isEditing = !!editingPost;
    const maxLength = 140;
    const remaining = maxLength - content.length;

    // userが存在しない場合の早期リターン
    if (!user) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-red-500 text-sm">ログインが必要です</p>
            </div>
        );
    }

    // 編集モード時に投稿内容をセット
    useEffect(() => {
        if (editingPost) {
            setContent(editingPost.content);
        } else {
            setContent("");
        }
        setError("");
    }, [editingPost]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // バリデーション
        const validation = validatePostContent(content);
        if (!validation.valid) {
            setError(validation.error ?? "");
            return;
        }

        // レート制限チェック（新規投稿のみ）
        if (!isEditing) {
            const rateLimit = checkRateLimit("post_create");
            if (!rateLimit.allowed) {
                setError(getRateLimitMessage("post_create", rateLimit.resetIn!));
                return;
            }
        }

        setSubmitting(true);
        setError("");

        try {
            if (isEditing) {
                // 編集
                if (!supabase || typeof supabase.from !== 'function') {
                    throw new Error('Supabaseクライアントが初期化されていません');
                }

                // タイムアウト付きでupdate実行
                const updatePromise = (supabase as any)
                    .from('posts')
                    .update({ content: content.trim() })
                    .eq('id', editingPost.id)
                    .select();
                
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('タイムアウト: 10秒経過')), 10000);
                });
                
                try {
                    const result = await Promise.race([updatePromise, timeoutPromise]) as any;
                    const { error } = result;
                    
                    if (error) {
                        console.error('投稿編集エラー:', error);
                        throw error;
                    }
                    
                    onPostUpdated();
                } catch (timeoutError: any) {
                    if (timeoutError.message?.includes('タイムアウト')) {
                        throw new Error('更新処理がタイムアウトしました。ネットワーク接続を確認してください。');
                    }
                    throw timeoutError;
                }
            } else {
                // 新規投稿
                const result = await supabase
                    .from('posts')
                    .insert({
                        user_id: user!.id,
                        content: content.trim(),
                    } as any)
                    .select();

                const { error } = result;

                if (error) {
                    console.error('投稿作成エラー:', error);
                    throw error;
                }

                onPostCreated();
            }

            setContent("");
        } catch (err: any) {
            console.error('投稿処理エラー:', err);

            //DBエラーに応じたメッセージ
            if (err.code === "23514") {
                setError("投稿内容が制約に違反しています");
            } else if (err.code === '42501') {
                setError('投稿する権限がありません');
            } else {
                setError(`投稿に失敗しました: ${err.message || '不明なエラー'}`);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            {/* ヘッダー */}
            {isEditing && (
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600">投稿を編集中</span>
                    <button
                        onClick={onCancelEdit}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        キャンセル
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* テキストエリア */}
                <textarea 
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        setError('');
                    }}
                    placeholder="いまどうしてる？"
                    rows={3}
                    maxLength={maxLength}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                />

                {/* フッター（残り文字数・投稿ボタン） */}
                <div className="flex items-center justify-between mt-3">
                    <span
                        className={`text-sm ${
                            remaining < 0
                                ? 'text-red-500 font-bold'
                                : remaining < 20
                                ? 'text-orange-500'
                                : 'text-gray-400'
                        }`}
                    >
                        残り {remaining} 文字
                    </span>
                    <button
                        type="submit"
                        disabled={submitting || content.trim().length === 0 || remaining < 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? '送信中...' : isEditing ? '更新' : '投稿'}
                    </button>
                </div>

                {error && (
                    <p className="mt-2 text-sm text-red-500">{error}</p>
                )}
            </form>
        </div>
    );
}