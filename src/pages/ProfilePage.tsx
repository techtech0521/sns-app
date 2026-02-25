import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FollowButton from '../components/profile/FollowButton';
import FollowStats from '../components/profile/FollowStats';

export default function ProfilePage() {
    const { profile, loading } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // フォロー状態変更時にフォロワー数を更新
    const handleFollowChange = () => {
        setRefreshTrigger(prev => prev + 1);
    }

    if (loading) {
        return <div className="text-center py-12 text-gray-400">読み込み中…</div>;
    }

    if (!profile) {
        return <div className="text-center py-12 text-red-500">プロフィールが見つかりません</div>;
    }

    const displayName = profile.username || profile.handle;
    const initials = displayName[0]?.toUpperCase() ?? '?';

    return (
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
                        <Link
                            to="/profile/edit"
                            className="px-4 py-1.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            編集
                        </Link>
                    </div>
                </div>

				{/* 表示名・handle */}
				<h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
				<p className="text-gray-500 text-sm">@{profile.handle}</p>

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