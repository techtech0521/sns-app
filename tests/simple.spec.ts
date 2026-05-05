import { test, expect } from '@playwright/test';

test('アプリが起動する', async ({ page }) => {

    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    await page.goto('/');
    
    // 認証ページにリダイレクトされる
    await page.waitForURL('/auth', { timeout: 30000 });
    
    // ログインフォームが表示される
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // ページタイトルを確認
    await expect(page).toHaveTitle(/sns-app/);

    // 【追加】新規登録タブをクリック
    await page.click("text=新規登録");

    // メールアドレスとパスワードを入力
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // サインアップボタンをクリック（タブを切り替えた後なので「新規登録」ボタンが表示されている）
    await Promise.all([
        page.waitForURL("/", { timeout: 30000 }),
        page.click("button[type='submit']")  // セレクタを変更
    ]);
    
    console.log('✅ アプリが正常に起動しました');
});