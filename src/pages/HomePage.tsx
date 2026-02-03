import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
	const { profile, signOut } = useAuth();

	const handleSignOut = async () => {
		await signOut();
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b border-gray-200">
				<div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
					<h1 className="text-2xl font-bold text-primary-600">SNS App</h1>
					<button onClick={handleSignOut} className="btn-secondary text-sm">
                        ログアウト
                    </button>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 py-8">
				<div className="card p-8 text-center">
					<h2 className="text-2xl font-bold mb-4">ようこそ！</h2>
					{profile && (
						<div className="space-y-2">
							<p className="text-gray-600">
								ユーザーID: <span className="font-mono text-primary-600">@{profile.handle}</span>
							</p>
							{profile.username && (
								<p className="text-gray-600">
									表示名: <span className="font-medium">{profile.username}</span>
								</p>
							)}
						</div>
					)}
					<p className="mt-6 text-gray-500">
						次のステップでプロフィール編集機能を実装します
					</p>
				</div>
			</main>
		</div>
	);
}