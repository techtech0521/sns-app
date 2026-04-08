import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FollowButton from '../components/profile/FollowButton';
import FollowStats from '../components/profile/FollowStats';
import PostCard from '../components/posts/PostCard';
import type { Database } from '../types/database.types';
 
type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
 
interface PostWithProfile extends Post {
    profiles: Profile;
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (profile) {
            fetchUserPosts();
        }
    }, [profile, refreshTrigger]);

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

    const handleEditPost = (post: PostWithProfile) => {
        // 投稿編集はホームページでのみ対応（簡易実装）
        console.log("投稿編集:", post);
    };

    const handleDeletePost = (postId: string) => {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
    };

    // フォロー状態変更時にフォロワー数を更新
    const handleFollowChange = () => {
        setRefreshTrigger(prev => prev + 1);
    }

    if (!profile) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400 text-sm">プロフィールを読み込んでいます...</p>
            </div>
        );
    }

    const displayName = profile.username || profile.handle;
    const initials = displayName[0]?.toUpperCase() ?? '?';

    return (
        <div className="space-y-4">
            {/* プロフィールカード */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* バナー */}
                <div className="h-24 bg-gradient-to-r from-blue-400 to-blue-600" />
                <div className="px-6 pb-6">
                    {/* アバターと編集ボタン（バナーに半分重なる） */}
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

                        <div>
                            <FollowButton
                                targetUserId={profile.id}
                                onFollowChange={handleFollowChange}
                            />
                            <button
                                onClick={() => navigate("/profile/edit")}
                                className="px-4 py-1.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                編集
                            </button>
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

            {/* 投稿タブ */}
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
                            <p className="text-gray-400 text-xs mt-1">ホームページで投稿してみましょう！</p>
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