import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { checkRateLimit, getRateLimitMessage } from "../../utils/rateLimit";

interface FollowButtonProps {
    targetUserId: string;
    onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, onFollowChange }: FollowButtonProps) {
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // 自分自身かどうか
    const isSelf = user?.id === targetUserId;

    // フォロー状態を取得
    useEffect(() => {
        if (user && !isSelf) {
            fetchFollowStatus();
        } else {
            setLoading(false);
        }
    }, [targetUserId, user, isSelf]);

    const fetchFollowStatus = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", user!.id)
                .eq("following_id", targetUserId)
                .maybeSingle();

            if (error) throw error;

            const followStatus = !!data;
            setIsFollowing(followStatus);
        } catch (error) {
            console.error('フォロー状態取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFollow = async () => {
        if (!user || processing || isSelf) return;

        // レート制限チェック
        const rateLimit = checkRateLimit("follow_toggle");
        if (!rateLimit.allowed) {
            setError(getRateLimitMessage("follow_toggle", rateLimit.resetIn!));
            setTimeout(() => setError(""), 3000);
            return;
        }

        // 楽観的UI更新
        const previousIsFollowing = isFollowing;
        setIsFollowing(!isFollowing);
        setProcessing(true);
        setError('');

        // 親コンポーネントに通知（フォロワー数更新用）
        onFollowChange?.(isFollowing);

        try {
            if (isFollowing) {
                // アンフォロー
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", user.id)
                    .eq("following_id", targetUserId);

                if (error) throw error;
            } else {
                // フォロー
                const { error } = await supabase
                    .from("follows")
                    .insert({
                        follower_id: user.id,
                        following_id: targetUserId,
                    } as any);

                if (error) throw error;
            }
        } catch (error: any) {
            console.error('フォロートグルエラー:', error);

            // エラー時は元に戻す
            setIsFollowing(previousIsFollowing);
            onFollowChange?.(previousIsFollowing);

            // エラーメッセージ
            if (error.code === '23514') {
                alert('自分自身をフォローすることはできません');
            } else if (error.code !== '23505') {
                alert('フォロー処理に失敗しました');
            }
            setTimeout(() => setError(''), 3000);
        } finally {
            setProcessing(false);
        }
    };

    // 自分自身の場合は表示しない
    if (isSelf) {
        return null;
    }

    if (loading) {
        return (
            <button
                disabled
                className="px-4 py-1.5 rounded-full border border-gray-300 text-sm font-medium text-gray-400 cursor-wait"
            >
                読込中...
            </button>
        );
    }

    return (
        <div>
            <button
                onClick={handleToggleFollow}
                disabled={processing}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isFollowing
                        ? 'border border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {processing ? '処理中...' : isFollowing ? 'フォロー中' : 'フォローする'}
            </button>
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
}