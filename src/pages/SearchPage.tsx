import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import FollowButton from "../components/profile/FollowButton";
import type { Database } from "../types/database.types";
import { sanitizeBio } from '../utils/sanitizer';

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function SearchPage() {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // デバウンス処理：入力停止から300ms後に検索実行
    useEffect(() => {
        if (query.trim().length === 0) {
            setResults([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        const timeoutId = setTimeout(() => {
            searchUsers(query);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const searchUsers = async (searchQuery: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .or(`username.ilike.%${searchQuery}%,handle.ilike.%${searchQuery}%`)
                .limit(20);

            if (error) throw error;

            setResults(data || []);
            setSearched(true);
        } catch (error) {
            console.error("ユーザー検索エラー:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 検索ヘッダー */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">ユーザー検索</h1>
                <p className="text-sm text-gray-500 mt-1">ユーザー名またはハンドルで検索</p>
            </div>

            {/* 検索バー */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ユーザーを検索..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                />
            </div>

            {/* 検索結果 */}
            <div>
                {loading && (
                    <div className="text-center py-8 text-gray-400">検索中...</div>
                )}

                {!loading && searched && results.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400 text-sm">ユーザーが見つかりませんでした</p>
                        <p className="text-gray-400 text-xs mt-1">別のキーワードで試してください</p>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500">{results.length}件のユーザーが見つかりました</p>
                        {results.map((profile) => (
                            <UserCard key={profile.id} profile={profile} currentUserId={user?.id} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ユーザーカードコンポーネント
interface UserCardProps {
    profile: Profile;
    currentUserId?: string;
}

function UserCard({ profile, currentUserId }: UserCardProps) {
    const displayName = profile.username || profile.handle;
    const initials = displayName[0]?.toUpperCase() ?? "?";
    const isSelf = currentUserId === profile.id;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
                {/* 左側：アバター＋情報 */}
                <Link
                    to={`/users/${profile.handle}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                >
                    {/* アバター */}
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {profile.avatar_url ? (
                            <img 
                                src={profile.avatar_url} 
                                alt={displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-lg font-bold text-blue-600">{initials}</span>
                        )}
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate hover:underline">
                            {displayName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">@{profile.handle}</p>
                        {profile.bio && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {sanitizeBio(profile.bio)}
                            </p>
                        )}
                    </div>
                </Link>

                {/* 右側：フォローボタン */}
                {!isSelf && (
                    <div className="flex-shrink-0 ml-4">
                        <FollowButton targetUserId={profile.id} />
                    </div>
                )}
            </div>
        </div>
    )
}