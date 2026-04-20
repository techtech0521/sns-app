import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { validateHandle } from '../utils/validation';
import { uplaodAvatar } from '../utils/imageUpload';

export default function ProfileEditPage() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const navigate = useNavigate();

    // フォーム値
    const [username, setUsername] = useState('');
    const [handle, setHandle] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // UI状態
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // profileが取得されたタイミングでフォームに流し込む
    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setHandle(profile.handle || '');
            setBio(profile.bio || '');
            setAvatarUrl(profile.avatar_url || '');
        }
    }, [profile]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // プレビュー表示
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        setAvatarFile(file);
    };

    // --- 送信 ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // 送信直前に再検証（リアルタイム検証の漏れに対する二重保障）
        const handleValidation = validateHandle(handle);
        if (!handleValidation.valid) {
            setError(handleValidation.error ?? '');
            return;
        }

        setSubmitting(true);

        try {
            let finalAvatarUrl = avatarUrl;

            // アバター画像のアップロード
            if (avatarFile && user) {
                setUploadingAvatar(true);
                const { url, error: uploadError } = await uplaodAvatar(avatarFile, user.id);

                if (uploadError) {
                    setError(uploadError);
                    setUploadingAvatar(false);
                    setSubmitting(false);
                    return;
                }

                if (url) {
                    finalAvatarUrl = url;
                }
                setUploadingAvatar(false);
            }

            // プロフィール更新
            const { error: updateError } = await (supabase as any)
                .from("profiles")
                .update({
                    username: username.trim() || null,
                    handle: handle.toLowerCase().trim(),
                    bio: bio.trim() || null,
                    avatar_url: finalAvatarUrl || null,
                })
                .eq("id", user!.id)
                .select()
                .single();

            if (updateError) {
                if (updateError.code === "23505") {
                    setError("このハンドルは既に使用されています");
                } else {
                    throw updateError;
                }
                return;
            }

            await refreshProfile();
            setSuccess(true);

            // 2秒後にプロフィールページへ遷移
            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (err) {
            console.error('プロフィール更新エラー:', err);
            setError('プロフィールの更新に失敗しました');
        } finally {
            setSubmitting(false);

        }
    };

    // ロード中・プロフィール未取得
    if (authLoading || !profile) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">読み込み中...</p>
            </div>
        );
    }

    const displayName = username || handle;
    const initials = displayName[0]?.toUpperCase() ?? "?";
    const currentAvatarUrl = previewUrl || avatarUrl;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    プロフィール編集
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* アバター */}
                    <div>
                        <label  className="block text-sm font-medium text-gray-700 mb-2">
                            アバター画像
                        </label>
                        <div className="flex items-center gap-4">
                            {/* アバタープレビュー */}
                            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                                {currentAvatarUrl ? (
                                    <img 
                                        src={currentAvatarUrl}
                                        alt="アバター"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-4xl font-bold text-blue-600">{initials}</span>
                                )}
                            </div>

                            {/* ファイル選択 */}
                            <div className="flex-1">
                                <input 
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    onChange={handleAvatarChange}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100
                                        cursor-pointer"
                                    disabled={submitting} 
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    JPEG、PNG、GIF、WebP（最大5MB）
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 表示名 */}
                    <div>
                        <label  htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            表示名
                        </label>
                        <input 
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="山田太郎"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                        />
                    </div>

                    {/* ハンドル */}
                    <div>
                        <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-2">
                            ハンドル
                        </label>
                        <div className="flex items-center">
                            <span className="text-gray-500 mr-2">@</span>
                            <input
                                type="text"
                                id="handle"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                                placeholder="yamada_taro"
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={submitting}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            3〜20文字、英数字とアンダースコアのみ
                        </p>
                    </div>

                    {/* 自己紹介 */}
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                            自己紹介
                        </label>
                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="よろしくお願いします！"
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                        />
                    </div>

                    {/* エラー・成功メッセージ */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-600">
                                保存しました！プロフィールページに戻ります...
                            </p>
                        </div>
                    )}

                    {/* ボタン */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/profile')}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={submitting}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploadingAvatar
                                ? '画像をアップロード中...'
                                : submitting
                                ? '保存中...'
                                : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}