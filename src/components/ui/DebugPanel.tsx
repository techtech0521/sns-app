import { useAuth } from '../../contexts/AuthContext';

export default function DebugPanel() {
    const { user, profile, loading } = useAuth();

    // 開発環境でのみ表示
    if (import.meta.env.PROD) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white text-xs p-3 rounded-lg max-w-sm z-50 font-mono">
            <div className="font-bold mb-2 text-green-400">🐛 Debug Info</div>
            <div className="space-y-1">
                <div>Loading: {loading ? '⏳ 読み込み中' : '✅ 完了'}</div>
                <div>User: {user ? '✅ ' + user.id.substring(0, 8) : '❌ なし'}</div>
                <div>Profile: {profile ? '✅ @' + profile.handle : '❌ なし'}</div>
                <div className="pt-2 border-t border-gray-600 mt-2">
                    <div className="text-gray-400 mb-1">認証状態:</div>
                    {!loading && user && profile ? (
                        <div className="text-green-400">🟢 正常</div>
                    ) : loading ? (
                        <div className="text-yellow-400">🟡 初期化中</div>
                    ) : (
                        <div className="text-red-400">🔴 異常</div>
                    )}
                </div>
                <div className="pt-2 text-gray-400 text-[10px]">
                    F12でコンソールを開いて詳細ログを確認
                </div>
            </div>
        </div>
    );
}