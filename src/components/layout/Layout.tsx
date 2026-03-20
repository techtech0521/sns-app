import { Link, Outlet, useNavigate  } from 'react-router-dom';
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from '../../lib/supabase';

export default function Layout() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ナビバー */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* 左側：ロゴ・ナビリンク */}
                        <div className="flex items-center gap-6">
                            <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
                                SimpleSNS
                            </Link>
                            <Link
                                to="/"
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                ホーム
                            </Link>
                            <Link
                                to="/search"
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                検索
                            </Link>
                        </div>
                        
                        {/* 右側：プロフィール・ログアウト */}
                        <div className="flex items-center gap-4">
                            {profile && (
                                <Link
                                    to="/profile"
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    @{profile.handle}
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="text-sm text-red-500 hover:text-red-600 font-medium"
                            >
                                ログアウト
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ページコンテンツ（子ルートがここに描画される） */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}