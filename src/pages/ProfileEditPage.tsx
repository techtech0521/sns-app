import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { validateHandle } from '../utils/validation';
import type { Database } from '../types/database.types';

export default function ProfileEditPage() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const navigate = useNavigate();

    // フォーム値
    const [username, setUsername] = useState('');
    const [handle, setHandle] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // UI状態
    const [handleError, setHandleError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // profileが取得されたタイミングでフォームに流し込む
    useEffect(() => {
        if (profile) {
            setUsername(profile.username ?? '');
            setHandle(profile.handle);
            setBio(profile.bio ?? '');
            setAvatarUrl(profile.avatar_url ?? '');
        }
    }, [profile]);

    // --- handle入力（小文字正規化 + リアルタイム検証） ---
    const onHandleChange = (value: string) => {
        const lowered = value.toLowerCase();
        setHandle(lowered);
        const result = validateHandle(lowered);
        setHandleError(result.error ?? '');
        setSaved(false);
        setGeneralError('');
    };

    // --- その他フィールド入力 ---
    const onFieldChange = (
        setter: React.Dispatch<React.SetStateAction<string>>,
        value: string
    ) => {
        setter(value);
        setSaved(false);
        setGeneralError('');
    };

    // --- 送信 ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 送信直前に再検証（リアルタイム検証の漏れに対する二重保障）
        const validation = validateHandle(handle);
        if (!validation.valid) {
            setHandleError(validation.error ?? '');
            return;
        }

        setSaving(true);
        setGeneralError('');
        setHandleError('');

        try {
            const updates: Database['public']['Tables']['profiles']['Update'] = {
                username: username.trim() || null,
                handle: handle.trim(),
                bio: bio.trim() || null,
                avatar_url: avatarUrl.trim() || null,
            };

            const { error } = await (supabase as any)
                .from('profiles')
                .update(updates)
                .eq('id', user!.id);
            
            if (error) {
                // PostgreSQLエラーコード → ユーザーフレンドリーメッセージ
                switch (error.code) {
                    case '23505': // unique_violation（handle重複）
                        setHandleError('このユーザーIDは既に使用されています');
                        break;
                    case '23514': // check_violation（handle形式・長さ）
                        setHandleError('ユーザーIDの形式が無効です');
                        break;
                    default:
                        setGeneralError('保存に失敗しました。もう一度試してください。');
                }
                return;
            }

            // コンテキスト内のprofileを再取得して同期
            await refreshProfile();
            setSaved(true);

            // 2秒後にプロフィールページへ遷移
            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (err) {
            console.error('プロフィール更新エラー:', err);
            setGeneralError('予期しないエラーが発生しました');
        } finally {
            setSaving(false);
        }
    };

    // ロード中・プロフィール未取得
    if (authLoading || !profile) {
        return <div className="text-center py-12 text-gray-400">読み込み中…</div>;
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-lg font-bold text-gray-900">プロフィール編集</h1>
                <button
                    onClick={() => navigate('/profile')}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    ← 戻る
                </button>
            </div>

            {/* フィードバックメッセージ */}
            {generalError && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {generalError}
                </div>
            )}
            {saved && (
                <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    プロフィールを更新しました ✓
                </div>
            )}

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* 表示名 */}
                <div>
                    <label htmlFor="username"  className="block text-sm font-medium text-gray-700 mb-1">
                        表示名
                    </label>
                    <input 
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => onFieldChange(setUsername, e.target.value)}
                        placeholder='山田太郎'
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    />
                </div>
                
                {/* ユーザーID（handle） */}
                <div>
                    <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
                        ユーザーID <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="handle"
                        type="text"
                        value={handle}
                        onChange={(e) => onHandleChange(e.target.value)}
                        placeholder="yamada_taro"
                        className={`w-full px-3 py-2 border rounded-lg text-sm
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                    ${handleError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        小文字英数字とアンダースコア(_)のみ・3〜20文字
                    </p>
                    {handleError && (
                        <p className="mt-1 text-xs text-red-500">{handleError}</p>
                    )}
                </div>

                {/* 自己紹介 */}
                <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                        自己紹介
                    </label>
                    <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => onFieldChange(setBio, e.target.value)}
                        rows={3}
                        placeholder="自己紹介を入力してください"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                </div>

                {/* アバターURL */}
                <div>
                    <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1">
                        アバターURL
                    </label>
                    <input
                        id="avatarUrl"
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => onFieldChange(setAvatarUrl, e.target.value)}
                        placeholder="https://example.com/avatar.png"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* ボタン */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={saving || !!handleError}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium
                                   hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? '保存中…' : '保存する'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium
                                   hover:bg-gray-200 transition-colors"
                    >
                        キャンセル
                    </button>
                </div>
            </form>
        </div>
    );
}