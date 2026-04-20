import { supabase } from "../lib/supabase";

/**
 * 画像ファイルのバリデーション
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // ファイル形式チェック
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: "対応していない画像形式です。JPEG、PNG、GIF、WebPのみアップロード可能です。",
        };
    }

    // ファイルサイズチェック（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: "ファイルサイズは5MB以下にしてください。",
        };
    }

    return { valid: true };
}

/**
 * 画像をアップロード
 * @param file アップロードする画像ファイル
 * @param bucket バケット名（"avatars または "post-images"）
 * @param path ストレージ内のパス
 * @returns 公開URL
 */
export async function uploadImage(
    file: File,
    bucket: "avatars" | "post-images",
    path: string
): Promise<{ url: string | null; error: string | null }> {
    try {
        // バリデーション
        const validation = validateImageFile(file);
        if (!validation.valid) {
            return { url: null, error: validation.error || "画像の検証に失敗しました" };
        }

        // アップロード
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: true, // 同じパスに既存ファイルがあれば上書き
            });

        if (error) {
            console.error("画像のアップロードエラー:", error);
            return { url: null, error: "画像のアップロードに失敗しました"};
        }

        // 公開URLを取得
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return { url: urlData.publicUrl, error: null }
    } catch (err) {
        console.error("画像アップロード例外, err");
        return { url: null, error: "予期しないエラーが発生しました"};
    }
}

/**
 * プロフィールアバターをアップロード
 * @param file 画像ファイル
 * @param userId ユーザーID
 * @returns 公開URL
 */
export async function uplaodAvatar(
    file: File,
    userId: string
): Promise<{ url: string | null; error: string | null }>{
    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    return uploadImage(file, "avatars", filePath);
}

/**
 * 投稿画像をアップロード
 * @param file 画像ファイル
 * @param userId ユーザーID
 * @param postId 投稿ID（なければタイムスタンプ使用）
 * @returns 公開URL
 */
export async function uploadPostImage(
    file: File,
    userId: string,
    postId?: string
): Promise<{ url: string | null; error: string | null }> {
    const fileExt = file.name.split(".").pop();
    const timestamp = Date.now();
    const id = postId || `temp_${timestamp}`;
    const filePath = `${userId}/${id}.${fileExt}`;

    return uploadImage(file, "post-images", filePath);
}

/**
 * 画像を削除
 * @param bucket バケット名
 * @param path ストレージ内のパス
 */
export async function deleteImage(
    bucket: "avatars" | "post-images",
    path: string
): Promise<{ success: boolean; error: string | null}> {
    try {
        const { error } = await supabase.storage.from(bucket).remove([path]);

        if (error) {
            console.error("画像削除エラー:", error);
            return { success: false, error: "画像の削除に失敗しました" };
        }

        return { success: true, error: null };
    } catch (err) {
        console.error("画像削除例外:", err);
        return { success: false, error: "予期しないエラーが発生しました" };
    }
}

/**
 * URLからストレージパスを抽出
 * @param url 公開URL
 * @returns ストレージパス
 */
export function extractStoragePath(url: string): string | null {
    try {
        // 例: https://xxx.supabase.co/storage/v1/object/public/avatars/user-id/avatar.jpg
        // → user-id/avatar.jpg
        const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        return match ? match[1] : null;
    } catch (err) {
        return null;
    }
}