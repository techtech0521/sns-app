import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import FollowButton from "../components/profile/FollowButton";
import FollowStats from "../components/profile/FollowStats";
import type { Database } from "../types/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function UserProfilePage() {
    const { handle } = useParams<{ handle: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 自分自身のプロフィールかどうか
    const isSelf = user?.id === profile?.id;

    useEffect(() => {
        if (handle) {
            fetchProfile();
        } else {
            setLoading(false);
            setError('ユーザーが見つかりません');
        }
    }, [handle]);

    const fetchProfile = async () => {
        if (!handle) {
            setError('ユーザーが見つかりません');
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            console.log('[UserProfilePage] プロフィール取得:', handle);

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("handle", handle)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    setError('ユーザーが見つかりません');
                } else {
                    throw error;
                }
                return;
            }

            console.log('[UserProfilePage] プロフィール取得成功:', data);
            setProfile(data);
        } catch (err) {
            console.error('[UserProfilePage] プロフィール取得エラー:', err);
            setError('プロフィールの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // フォロー状態変更時にフォロワー数を更新
    const handleFollowChange = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    if (loading) {
        return <div className="text-center py-12 text-gray-400">読み込み中…</div>;
    }

    if (error || !profile) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error || 'ユーザーが見つかりません'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                    ホームに戻る
                </button>
            </div>
        );
    }

    const displayName = profile.username || profile.handle;
    const initials = displayName[0]?.toUpperCase() ?? "?";

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* バナー */}
            <div className="h-24 bg-gradient-to-r from-blue-400 to-blue-600" />

            <div className="px-6 pb-6">
                {/* アバターとアクションボタン（バナーに半分重なる） */}
                <div className="flex items-end justify-between -mt-10 mb-3">
                    <div className="w-20 h-20 rounded-full border-4 border-white bg-blue-100 flex items-center justify-center shadow-sm overflow-hidden">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-3xl font-bold text-blue-600">{initials}</span>
                        )}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex gap-2">
                        {isSelf ? (
                            // 自分のプロフィール：編集ボタンのみ
                            <button
                                onClick={() => navigate('/profile/edit')}
                                className="px-4 py-1.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                編集
                            </button>
                        ) : (
                            // 他人のプロフィール：フォローボタン
                            <FollowButton
                                targetUserId={profile.id}
                                onFollowChange={handleFollowChange}
                            />
                        )}
                    </div>
                </div>

                {/* 表示名・handle */}
                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                <p className="text-gray-500 text-sm mb-3">@{profile.handle}</p>

                {/* 自己紹介 */}
                {profile.bio && (
                    <p className="mt-3 text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
                )}

                {/* フォロー統計 */}
                <div className="mt-4">
                    <FollowStats userId={profile.id} refreshTrigger={refreshTrigger} />
                </div>

                {/* 登録日 */}
                <p className="mt-4 text-xs text-gray-400">
                    登録日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                </p>
            </div>
        </div>
    );
}