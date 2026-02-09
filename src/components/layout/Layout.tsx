import { Link, Outlet } from 'react-router-dom';
import { useAuth } from "../../contexts/AuthContext";

export default function Layout() {
    const { profile, signOut } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ナビバー */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <Link to="/" className="text-lg font-bold text-blue-600">
                        SimpleSNS
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/profile"
                            className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            @{profile?.handle ?? '…'}
                        </Link>
                        <button
                            onClick={signOut}
                            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                        >
                            ログアウト
                        </button>
                    </div>
                </div>
            </header>

            {/* ページコンテンツ（子ルートがここに描画される） */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}