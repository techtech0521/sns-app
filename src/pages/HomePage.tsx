import { useState } from 'react';
import PostForm from '../components/posts/PostForm';
import PostList from '../components/posts/PostList';
import type { Database } from '../types/database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PostWithProfile extends Post {
    profiles: Profile;
}

export default function HomePage() {
	const [editingPost, setEditingPost] = useState<PostWithProfile | null>(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	// 新規投稿作成後の処理
	const handlePostCreated = () => {
		setRefreshTrigger((prev) => prev + 1);
	};

	// 投稿更新後の処理
	const handlePostUpdated = () => {
		setEditingPost(null);
		setRefreshTrigger((prev) => prev + 1);
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

			{/* タイムライン */}
			<div>
				<PostList 
					onEditPost={handleEditPost} 
					refreshTrigger={refreshTrigger} 
				/>
			</div>
		</div>
	);
}