import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface FollowStatsProps {
    userId: string;
    refreshTrigger?: number;
}

export default function FollowStats({ userId, refreshTrigger = 0}: FollowStatsProps) {
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFollowStats()
    }, [userId, refreshTrigger]);

    const fetchFollowStats = async () => {
        try {
            setLoading(true);

            // フォロワー数（このユーザーをフォローしている人数）
            const { count: followers, error: followersError } = await supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("following_id", userId);

            if (followersError) throw followersError;

            // フォロー中の数（このユーザーがフォローしている人数）
            const { count: following, error: followingError } = await supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("follower_id", userId);

            if (followingError) throw followingError;

            setFollowerCount(followers || 0);
            setFollowingCount(following || 0);
        } catch (error) {
            console.error('フォロー統計取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex gap-4 text-sm text-gray-400">
                <span>読込中...</span>
            </div>
        );
    }

    return (
        <div className="flex gap-4 text-sm">
            <div>
                <span className="font-bold text-gray-900">{followingCount}</span>
                <span className="text-gray-500 ml-1">フォロー中</span>
            </div>
            <div>
                <span className="font-bold text-gray-900">{followerCount}</span>
                <span className="text-gray-500 ml-1">フォロワー</span>
            </div>
        </div>
    );
}