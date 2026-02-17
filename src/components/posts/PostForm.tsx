import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { validatePostContent } from "../../utils/validation";
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

    // Supabaseクライアントの存在確認（コンポーネントマウント時）
    useEffect(() => {
        console.log('[PostForm] Supabaseクライアント初期確認:', {
            exists: !!supabase,
            hasFrom: typeof supabase?.from === 'function',
            type: typeof supabase
        });
    }, []);

    console.log('[PostForm] レンダリング', { 
        isEditing: !!editingPost, 
        userId: user?.id,
        contentLength: content.length 
    });

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
        console.log('[PostForm] Submit開始', { isEditing, content: content.substring(0, 20) });

        // バリデーション
        const validation = validatePostContent(content);
        if (!validation.valid) {
            console.log('[PostForm] バリデーションエラー:', validation.error);
            setError(validation.error ?? "");
            return;
        }

        console.log('[PostForm] バリデーションOK、送信処理開始');
        setSubmitting(true);
        setError("");

        try {
            if (isEditing) {
                // 編集
                console.log('[PostForm] 編集開始', editingPost.id);
                console.log('[PostForm] supabaseオブジェクト:', supabase);
                console.log('[PostForm] supabase.from:', typeof supabase?.from);
                console.log('[PostForm] update()呼び出し直前');

                if (!supabase || typeof supabase.from !== 'function') {
                    throw new Error('Supabaseクライアントが初期化されていません');
                }

                // タイムアウト付きでupdate実行
                const updatePromise = supabase
                    .from('posts')
                    .update({ content: content.trim() } as any)
                    .eq('id', editingPost.id)
                    .select();

                console.log('[PostForm] updatePromise作成完了:', updatePromise);
                
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('タイムアウト: 10秒経過')), 10000);
                });
                
                try {
                    console.log('[PostForm] Promise.race開始');
                    const result = await Promise.race([updatePromise, timeoutPromise]) as any;
                    console.log('[PostForm] Promise.race完了');
                    console.log('[PostForm] update()呼び出し直後', result);
                    const { data, error } = result;

                    console.log('[PostForm] 編集結果', { data, error });
                    
                    if (error) {
                        console.error('[PostForm] 編集エラー:', error);
                        throw error;
                    }
                    
                    console.log('[PostForm] onPostUpdated()呼び出し');
                    onPostUpdated();
                } catch (timeoutError: any) {
                    if (timeoutError.message?.includes('タイムアウト')) {
                        console.error('[PostForm] 10秒タイムアウト発生 - ネットワークタブを確認してください');
                        console.error('[PostForm] updatePromiseの状態:', updatePromise);
                        throw new Error('更新処理がタイムアウトしました。ネットワーク接続を確認してください。');
                    }
                    throw timeoutError;
                }
            } else {
                // 新規投稿
                console.log('[PostForm] 新規投稿開始');
                console.log('[PostForm] insert()呼び出し直前', {
                    user_id: user!.id,
                    content: content.trim()
                });

                const result = await supabase
                    .from('posts')
                    .insert({
                        user_id: user!.id,
                        content: content.trim(),
                    } as any)
                    .select();

                console.log('[PostForm] insert()呼び出し直後', result);
                const { data, error } = result;

                console.log('[PostForm] 新規投稿結果', { data, error });

                if (error) {
                    console.error('[PostForm] 新規投稿エラー:', error);
                    throw error;
                }

                console.log('[PostForm] onPostCreated()呼び出し');
                onPostCreated();
            }

            setContent("");
            console.log('[PostForm] 処理完了');
        } catch (err: any) {
            console.error('[PostForm] Catchブロック:', err);
            console.error('[PostForm] エラー詳細:', {
                message: err?.message,
                code: err?.code,
                details: err?.details,
                hint: err?.hint,
                stack: err?.stack
            });

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
            console.log('[PostForm] Finally: submitting=false');
        }
    };

    const handleCancel = () => {
        setContent("");
        setError("");
        onCancelEdit();
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <form onSubmit={handleSubmit}>
                {/* ヘッダー */}
                {isEditing && (
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">投稿を編集</h3>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            キャンセル
                        </button>
                    </div>
                )}

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
                    className={`w-full px-3 py-2 border rounded-lg text-sm resize-none
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />

                {/* エラーメッセージ */}
                {error && (
                    <p className="mt-2 text-xs text-red-500">{error}</p>
                )}

                {/* フッター（残り文字数・投稿ボタン） */}
                <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs ${remaining < 0 ? 'text-red-500' : remaining < 20 ? 'text-orange-500' : 'text-gray-400'}`}>
                        残り {remaining} 文字
                    </span>
                    <button
                        type="submit"
                        disabled={submitting || !content.trim() || remaining < 0}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full
                                   hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? '送信中...' : isEditing ? '更新' : '投稿'}
                    </button>
                </div>
            </form>
        </div>
    );
}