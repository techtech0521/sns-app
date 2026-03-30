import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { checkRateLimit, getRateLimitMessage } from "../../utils/rateLimit";

interface LikeButtonProps {
    postId: string;
}

export default function LikeButton({ postId }: LikeButtonProps) {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // いいね情報を取得
    useEffect(() => {
        if (user) {
            fetchLikeStatus();
        }
    }, [postId, user]);

    const fetchLikeStatus = async () => {
        try {
            setLoading(true);

            // いいね数を取得
            const { count, error: countError } = await supabase
                .from("likes")
                .select("*", { count: "exact", head: true })
                .eq("post_id", postId);

            if (countError) throw countError;
            setLikeCount(count || 0);

            // 自分がいいねしているか確認
            if (user) {
                const { data, error: statusError } = await supabase
                    .from("likes")
                    .select("id")
                    .eq("post_id", postId)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (statusError) throw statusError;
                setIsLiked(!!data);
            }
        } catch (error) {
            console.error('いいね情報取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleLike = async () => {
        if (!user || processing) return;

        // レート制限チェック
        const rateLimit = checkRateLimit("like_toggle");
        if (!rateLimit.allowed) {
            setError(getRateLimitMessage("like_toggle", rateLimit.resetIn!));
            setTimeout(() => setError(""), 3000); // 3秒後にエラーメッセージを消す
            return;
        }

        // 楽観的UI更新（即座に反映）
        const previousIsLiked = isLiked;
        const previousLikeConunt = likeCount;

        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1: likeCount + 1);
        setProcessing(true);
        setError('');

        try {
            if (isLiked) {
                // いいね解除
                const { error } = await supabase
                    .from("likes")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", user.id);

                if (error) throw error;
            } else {
                // いいね追加
                const { error } = await supabase
                    .from("likes")
                    .insert({
                        post_id: postId,
                        user_id: user.id,
                    } as any);

                if (error) throw error;
            }
        } catch (error: any) {
            console.error('いいねトグルエラー:', error);

            // エラー時は元に戻す
            setIsLiked(previousIsLiked);
            setLikeCount(previousLikeConunt);

            // エラーメッセージ
            if (error.code !== '23505') {
                alert('いいねの処理に失敗しました');
                setTimeout(() => setError(''), 3000);
            }
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-gray-400">
                <span className="text-lg">♡</span>
                <span className="text-sm">...</span>
            </div>
        );
    }

    return (
        <div>
            <button
                onClick={handleToggleLike}
                disabled={!user || processing}
                className={`flex items-center gap-2 transition-colors ${
                    user
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
