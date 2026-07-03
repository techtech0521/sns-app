import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { checkRateLimit, getRateLimitMessage } from "../../utils/rateLimit";

interface LikeButtonProps {
    postId: string;
    likes?: { id: string; user_id: string }[];
    currentUserId?: string;
}

export default function LikeButton({ postId, likes = [], currentUserId }: LikeButtonProps) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // いいね情報を計算（Supabaseクエリなし）
    const isLiked = currentUserId ? likes.some(like => like.user_id === currentUserId) : false;
    const likeCount = likes.length;

    const handleToggleLike = async () => {
        if (!currentUserId || processing) return;

        // レート制限チェック
        const rateLimit = checkRateLimit("like_toggle");
        if (!rateLimit.allowed) {
            setError(getRateLimitMessage("like_toggle", rateLimit.resetIn!));
            setTimeout(() => setError(""), 3000); // 3秒後にエラーメッセージを消す
            return;
        }
        
        // UIを即座に更新
        setProcessing(true);
        setError('');

        try {
            if (isLiked) {
                // いいね解除
                const { error } = await supabase
                    .from("likes")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", currentUserId);

                if (error) throw error;
            } else {
                // いいね追加
                const { error } = await supabase
                    .from("likes")
                    .insert({
                        post_id: postId,
                        user_id: currentUserId,
                    } as any);

                if (error) throw error;
            }
        // 成功したら親コンポーネントからデータを再取得させる必要がある
        // *実際にはonLikeChange コールバックを呼び出すなどして親に通知する
        // 今回は実装範囲外とする
        } catch (error: any) {
            console.error('いいねトグルエラー:', error);

            // エラーメッセージ
            if (error.code !== '23505') {
                alert('いいねの処理に失敗しました');
                setTimeout(() => setError(''), 3000);
            }
        } finally {
            setProcessing(false);
        }
    };

    // ローディング表示は不要（データはすでに取得済み）
    return (
        <div>
            <button
                onClick={handleToggleLike}
                disabled={!currentUserId || processing}
                className={`flex items-center gap-2 transition-colors ${
                    currentUserId
                        ? 'hover:text-red-500 cursor-pointer'
                        : 'cursor-not-allowed opacity-50'
                } ${processing ? 'opacity-50' : ''}`}
            >
                {/* ハートアイコン */}
                <span
                    className={`text-lg transition-all ${
                        isLiked
                            ? 'text-red-500 scale-110'
                            : 'text-gray-400'
                    }`}
                >
                    {isLiked ? '❤️' : '♡'}
                </span>

                {/* いいね数 */}
                <span
                    className={`text-sm font-medium ${
                        isLiked ? 'text-red-500' : 'text-gray-500'
                    }`}
                >
                    {likeCount}
                </span>
            </button>
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
}
