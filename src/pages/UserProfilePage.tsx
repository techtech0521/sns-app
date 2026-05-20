import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import FollowButton from "../components/profile/FollowButton";
import FollowStats from "../components/profile/FollowStats";
import PostCard from "../components/posts/PostCard";
import type { Database } from "../types/database.types"
import { sanitizeBio } from '../utils/sanitizer';

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Post = Database["public"]["Tables"]["posts"]["Row"];

interface PostWithProfile extends Post {
    profiles: Profile;
}

export default function UserProfilePage() {
    const { handle } = useParams<{ handle: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
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

    useEffect(() => {
        if (profile) {
            fetchUserPosts();
        }
    }, [profile, refreshTrigger]);

    const fetchProfile = async () => {
        if (!handle) {
            setError('ユーザーが見つかりません');
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            setError("");

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

            setProfile(data);
        } catch (err) {
            console.error('プロフィール取得エラー:', err);
            setError('プロフィールの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPosts = async () => {
        if (!profile) return;

        try {
            setLoadingPosts(true);

            const { data, error } = await supabase
                .from("posts")
                .select(`
                    *,
                    profiles (*)
                `)
                .eq("user_id", profile.id)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            setPosts(data as PostWithProfile[]);
        } catch (err) {
            console.error("投稿取得エラー:", err);
        } finally {
            setLoadingPosts(false);
        }
    };

    // フォロー状態変更時にフォロワー数を更新
    const handleFollowChange = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleEditPost = (post: PostWithProfile) => {
        // 投稿編集はホームページでのみ対応（簡易実装）
        // 必要に応じて拡張可能
        console.log("投稿編集:", post);
    };

    const handleDeletePost = (postId: string) => {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
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
        <div className="space-y-4">
            {/* プロフィールカード */}
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
                        <p className="mt-3 text-gray-700 whitespace-pre-wrap">
                            {sanitizeBio(profile.bio)}
                        </p>
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

            { /* 投稿タブ */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* タブヘッダー */}
                <div className="border-b border-gray-200">
                    <div className="px-6 py-3">
                        <h2 className="text-sm font-bold text-blue-600 border-b-2 border-blue-600 inline-block pb-2">
                            投稿
                        </h2>
                    </div>
                </div>

                {/* 投稿一覧 */}
                <div className="p-4">
                    {loadingPosts ? (
                        <div className="text-center py-8 text-gray-400">読み込み中...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400 text-sm">まだ投稿がありません</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onEdit={handleEditPost}
                                    onDelete={handleDeletePost}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}