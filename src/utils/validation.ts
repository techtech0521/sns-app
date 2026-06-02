// handleのバリデーション（要件定義に基づく）
export const validateHandle = (handle: string): { valid: boolean; error?: string } => {
    const trimmed = handle.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'ユーザーIDを入力してください' };
    }

    if (trimmed.length < 3) {
        return { valid: false, error: 'ユーザーIDは3文字以上である必要があります' };
    }

    if (trimmed.length > 20) {
        return { valid: false, error: 'ユーザーIDは20文字以下である必要があります' };
    }

    // 小文字英数字とアンダースコアのみ
    const handleRegex = /^[a-z0-9_]+$/;
    if (!handleRegex.test(trimmed)) {
        return { valid: false, error: 'ユーザーIDは小文字英数字とアンダースコア(_)のみ使用できます' };
    }

    return { valid: true };
};

// 投稿内容のバリデーション
export const validatePostContent = (content: string): { valid: boolean; error?: string } => {
    const trimmed = content.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: '投稿内容を入力してください' };
    }

    if (trimmed.length > 140) {
        return { valid: false, error: '投稿は140文字以内で入力してください' };
    }

    return { valid: true };
};

// メールアドレスのバリデーション
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
    const trimmed = email.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'メールアドレスを入力してください' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: '有効なメールアドレスを入力してください' };
    }

    return { valid: true };
};

// パスワードのバリデーション
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length === 0) {
        return { valid: false, error: 'パスワードを入力してください' };
    }

    if (password.length < 6) {
        return { valid: false, error: 'パスワードは6文字以上である必要があります' };
    }

    return { valid: true };
};

// コメント内容のバリデーション
export const validateCommentContent = (content: string): { valid: boolean; error?: string } => {
    const trimmed = content.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: "コメントを入力してください" };
    }

    if (trimmed.length > 140) {
        return { valid: false, error: "コメントは140文字以内で入力してください" };
    }

    return { valid: true };
};
