/** 
 * レート制限ユーティリティ
 * LocalStorageを使用した簡易的なレート制限実装
 */

interface RateLimitConfig {
    maxAttempts: number;  // 最大試行回数
    windowMs: number;     // 時間窓（ミリ秒）
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    post_create: { maxAttempts: 10, windowMs: 60000 },   // 1分間に10投稿まで
    like_toggle: { maxAttempts: 30, windowMs: 60000 },   // 1分間に30いいねまで
    follow_toggle: { maxAttempts: 20, windowMs: 60000 }, // 1分間に20フォローまで
};

interface AttemptRecord {
    timestamps: number[];
}

/**
 * レート制限をチェックし、許可されているか判定
 * @param action アクション名（post_create, like_toggle, follow_toggle）
 * @returns { allowed: boolean, resetIn?: number } - allowed: 許可されているか、resetIn: 制限解除までの秒数
 */
export function checkRateLimit(action: string): { allowed: boolean, resetIn?: number} {
    const config = RATE_LIMITS[action];
    if (!config) {
        console.warn(`レート制限の設定が見つかりません: ${action}`);
        return { allowed: true };
    }

    const storageKey = `rate_limit_${action}`;
    const now = Date.now();

    // LocalStorageから記録を取得
    let record: AttemptRecord;
    try {
        const stored = localStorage.getItem(storageKey);
        record = stored ? JSON.parse(stored) : { timestamps: [] };
    } catch (error) {
        console.error("レート制限の記録取得エラー:", error);
        record = { timestamps: [] };
    }

    // 時間窓外の古い記録を削除
    const validTimestamps = record.timestamps.filter(
        (timestamp) => now - timestamp < config.windowMs
    );

    // 制限をチェック
    if (validTimestamps.length >= config.maxAttempts) {
        // 制限に達している
        const oldestTimestamp = validTimestamps[0];
        const resetIn = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);
        return { allowed: false, resetIn };
    }

    // 制限内なので、新しい記録を追加
    validTimestamps.push(now);
    const newRecord: AttemptRecord = {timestamps: validTimestamps };

    try {
        localStorage.setItem(storageKey, JSON.stringify(newRecord));
    } catch (error) {
        console.error('レート制限の記録保存エラー:', error);
    }

    return { allowed: true };
}

/**
 * レート制限のリセット（主にテスト用）
 * @param action アクション名
 */
export function restRateLimit(action: string): void {
    const storageKey = `rate_limit_${action}`;
    localStorage.removeItem(storageKey);
}

/**
 * レート制限エラーメッセージを生成
 * @param action アクション名
 * @param resetIn 制限解除までの秒数
 * @returns エラーメッセージ
 */
export function getRateLimitMessage(action: string, resetIn: number): string {
    const messages: Record<string, string> = {
        post_create: `投稿の制限に達しました。${resetIn}秒後に再試行してください。`,
        like_toggle: `いいねの制限に達しました。${resetIn}秒後に再試行してください。`,
        follow_toggle: `フォローの制限に達しました。${resetIn}秒後に再試行してください。`,
    };

    return messages[action] || `制限に達しました。${resetIn}秒後に再試行してください。`;
}
