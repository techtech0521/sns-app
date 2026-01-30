import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // バリデーション
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            setError(emailValidation.error!);
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            setError(passwordValidation.error!);
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                // ログイン
                const { error: signInError } = await signIn(email, password);
                if (signInError) {
                    setError('メールアドレスまたはパスワードが間違っています');
                } else {
                    navigate('/');
                }
            } else {
                // サインアップ
                const { error: signUpError } = await signUp(email, password);
                if (signUpError) {
                    if (signUpError.message.includes('already registered')) {
                        setError('このメールアドレスは既に登録されています');
                    } else {
                        setError('アカウント作成に失敗しました');
                    }
                } else {
                    setMessage('確認メールを送信しました。メールを確認してください。');
                }
            }
        } catch (err) {
            setError('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary-600 mb-2">SNS App</h1>
                    <p className="text-gray-600">シンプルなSNSへようこそ</p>
                </div>

                <div className="card p-8">
                    <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                        <button
                            type='button'
                            onClick={() => {
                                setIsLogin(true);
                                setError('');
                                setMessage('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                                isLogin
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            ログイン
                        </button>
                        <button
                            type='button'
                            onClick={() => {
                                setIsLogin(false);
                                setError('');
                                setMessage('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                                !isLogin
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            新規登録
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                メールアドレス
                            </label>
                            <input 
                                id='email'
                                type='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className='input'
                                placeholder='example@email.com'
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                パスワード
                            </label>
                            <input 
                                id='password'
                                type='password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className='input'
                                placeholder='6文字以上'
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                                {message}
                            </div>
                        )}

                        <button type='submit' className="btn-primary w-full" disabled={loading}>
                            {loading ? '処理中...' : isLogin ? 'ログイン' : '新規登録'}
                        </button>
                    </form>

                    {!isLogin && (
                        <p className="mt-4 text-xs text-gray-500 text-center">
                            アカウント作成後、プロフィールを編集できます
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}