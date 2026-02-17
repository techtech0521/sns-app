import { useState } from 'react';
import PostForm from '../components/posts/PostForm';
import PostList from '../components/posts/PostList';
import DebugPanel from '../components/ui/DebugPanel';
import type { Database } from '../types/database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PostWithProfile extends Post {
    profiles: Profile;
}

export default function HomePage() {
	const [editingPost, setEditingPost] = useState<PostWithProfile | null>(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

    console.log('[HomePage] レンダリング', { 
        editingPost: editingPost?.id, 
        refreshTrigger 
    });

	// 新規投稿作成後の処理
	const handlePostCreated = () => {
        console.log('[HomePage] handlePostCreated呼ばれた');
		setRefreshTrigger((prev) => {
            console.log('[HomePage] refreshTrigger更新:', prev, '->', prev + 1);
            return prev + 1;
        });
	};

	// 投稿更新後の処理
	const handlePostUpdated = () => {
        console.log('[HomePage] handlePostUpdated呼ばれた');
		setEditingPost(null);
		setRefreshTrigger((prev) => {
            console.log('[HomePage] refreshTrigger更新:', prev, '->', prev + 1);
            return prev + 1;
        });
	};

	// 編集キャンセル
	const handleCancelEdit = () => {
        console.log('[HomePage] handleCancelEdit呼ばれた');
		setEditingPost(null);
	};

	// 編集モード開始
	const handleEditPost = (post: PostWithProfile) => {
        console.log('[HomePage] handleEditPost呼ばれた', post.id);
		setEditingPost(post);
		// フォームまでスクロール
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<div className="space-y-6">
            {/* デバッグパネル（開発時のみ表示） */}
            <DebugPanel />

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