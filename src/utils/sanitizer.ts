import createDOMPurify from 'dompurify';

// DOMPurifyのインスタンスを作成（サーバーサイド対応のためtypeofチェック）
  const DOMPurify = createDOMPurify(typeof window !== 'undefined' ? window : undefined);

/**
 * HTML をサニタイズしてXSS攻撃を防ぐ
 * @param html - サニタイズ対象のHTML文字列
 * @param options - DOMPurify設定オプション
 * @returns サニタイズされた安全なHTML文字列
 */
export function sanitizeHtml(html: string, options?: any): string {
    if (!html) return "";
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [],                                                                                                                                                       
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,                                                                                                                                                     
        ...options,
    }) as unknown as string;
}

/**
 * 投稿内容をサニタイズ（改行維持）
 */
export function sanitizePostContent(content: string): string {
    return sanitizeHtml(content);
}

/**
 * プロフィールbioをサニタイズ
 */
export function sanitizeBio(bio: string | null | undefined): string {
    if (!bio) return "";
    return sanitizeHtml(bio);
}

/**
 * メンションやハッシュタグを含むテキストをサニタイズ（将来用）
 */
export function sanitaizeTextWithMensions(text: string): string {
    return sanitizeHtml(text);
}