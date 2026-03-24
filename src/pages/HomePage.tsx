import { useState } from 'react';
import PostForm from '../components/posts/PostForm';
import PostList from '../components/posts/PostList';
import type { Database } from '../types/database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PostWithProfile extends Post {
    profiles: Profile;
}

type TabType = "all" | "following";

export default function HomePage() {
	const [editingPost, setEditingPost] = useState<PostWithProfile | null>(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [activeTab, setActiveTab] = useState<TabType>("all");

	// 新規投稿作成後の処理
	const handlePostCreated = () => {
		setRefreshTrigger((prev) => {
            return prev + 1;
        });
	};

	// 投稿更新後の処理
	const handlePostUpdated = () => {
		setEditingPost(null);
		setRefreshTrigger((prev) => {
            return prev + 1;
        });
	};

	// 編集キャンセル
	const handleCancelEdit = () => {
		setEditingPost(null);
	};

	// 編集モード開始
	const handleEditPost = (post: PostWithProfile) => {
		setEditingPost(post);
		// フォームまでスクロール
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<div className="space-y-6">

			{/* ページタイトル */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900">ホーム</h1>
				<p className="text-sm text-gray-500 mt-1">最新の投稿</p>
			</div>

			{/* 投稿フォーム */}
			<PostForm
				editingPost={editingPost}
				onPostCreated={handlePostCreated}
				onPostUpdated={handlePostUpdated}
				onCancelEdit={handleCancelEdit}
			/>

			{/* タブ切り替え */}
			<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
				<div className="flex border-b border-gray-200">
					<button
						onClick={() => setActiveTab("all")}
						className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'all'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
					>
						全体
					</button>
					<button
						onClick={() => setActiveTab("following")}
						className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'following'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
					>
						フォロー中
					</button>
				</div>

				{/* タイムライン */}
				<div>
					<PostList 
						onEditPost={handleEditPost} 
						refreshTrigger={refreshTrigger}
						filterType={activeTab} 
					/>
				</div>
			</div>
		</div>
	);
}