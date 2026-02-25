import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FollowButtonProps {
    targetUserId: string;
    onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, onFollowChange }: FollowButtonProps) {
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

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
            console.log('[FollowButton] フォロー状態取得:', { follower: user!.id, following: targetUserId });

            const { data, error } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", user!.id)
                .eq("following_id", targetUserId)
                .maybeSingle();

            if (error) throw error;

            const followStatus = !!data;
            console.log('[FollowButton] フォロー状態:', followStatus);
            setIsFollowing(followStatus);
        } catch (error) {
            console.error('[FollowButton] フォロー状態取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFollow = async () => {
        if (!user || processing || isSelf) return;

        console.log('[FollowButton] トグル開始:', { isFollowing, targetUserId });

        // 楽観的UI更新
        const previousIsFollowing = isFollowing;
        setIsFollowing(!isFollowing);
        setProcessing(true);

        // 親コンポーネントに通知（フォロワー数更新用）
        onFollowChange?.(isFollowing);

        try {
            if (isFollowing) {
                // アンフォロー
                console.log('[FollowButton] アンフォロー実行');
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", user.id)
                    .eq("following_id", targetUserId);

                if (error) throw error;
                console.log('[FollowButton] アンフォロー成功');
            } else {
                // フォロー
                console.log('[FollowButton] フォロー実行');
                const { error } = await supabase
                    .from("follows")
                    .insert({
                        follower_id: user.id,
                        following_id: targetUserId,
                    } as any);

                if (error) throw error;
                console.log('[FollowButton] フォロー成功');
            }
        } catch (error: any) {
            console.error('[FollowButton] トグルエラー:', error);

            // エラー時は元に戻す
            setIsFollowing(previousIsFollowing);
            onFollowChange?.(previousIsFollowing);

            // エラーメッセージ
            if (error.code === "23505") {
                console.log('[FollowButton] 重複フォロー検出（無視）');
            } else if (error.code === "23514") {
                alert('自分自身をフォローすることはできません');
            } else {
                alert('フォロー処理に失敗しました');
            }
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
    );
}