import { test, expect } from "@playwright/test";

test.describe("認証機能", () => {
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    test("ユーザー登録ができる", async ({ page }) => {
        // 認証ページのアクセス
        await page.goto("/auth");

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

        // ナビバーにハンドルが表示される
        await expect(page.locator("nav")).toContainText("@");

        // 投稿フォームが表示される
        await expect(page.locator("textarea")).toBeVisible();
    });

    test("ログインができる", async ({ page }) => {
        // 認証ページにアクセス
        await page.goto("/auth");

        // 【追加】ログインタブをクリック
        await page.click("text=ログイン");

        // メールアドレスとパスワードを入力
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);

        // サインアップボタンをクリック（タブを切り替えた後なので「ログイン」ボタンが表示されている）
        await Promise.all([
            page.waitForURL("/", { timeout: 30000 }),
            page.click("button[type='submit']")  // セレクタを変更
        ]);

        // ナビバーにハンドルが表示される
        await expect(page.locator('nav')).toContainText('@');
    });

    test("間違ったパスワードでログイン失敗", async ({ page}) => {
        await page.goto('/auth');

        // 【追加】ログインタブをクリック
        await page.click("text=ログイン");
 
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', 'WrongPassword123!');
    
        await page.click("button[type='submit']")

        // エラーメッセージが表示される
        await expect(page.getByText("メールアドレスまたはパスワードが間違っています")).toBeVisible({ timeout: 10000 });
    });

    test("ログアウトができる", async ({ page }) => {
        // まずログイン
        await page.goto('/auth');
        await page.click("text=ログイン");
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await Promise.all([
            page.waitForURL("/", { timeout: 30000 }),
            page.click("button[type='submit']")
        ]);

        // ログアウトボタンをクリック
        await page.click("text=ログアウト");

        // 認証ページにリダイレクトされる
        await page.waitForURL("/auth");

        // ログインフォームが表示される
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test("未ログイン時は保護ページにアクセスできない", async ({ page }) => {
        // 認証ページに移動（ログインしていない状態）
        await page.goto("/auth");
        await expect(page.locator('input[type="email"]')).toBeVisible();

        // 保護されたページに直接アクセス
        await page.goto("/");

        // 認証ページへリダイレクト
        await page.waitForURL("/auth");
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test("無効なURLはホームへリダイレクト", async ({ page }) => {
        // ログイン状態で
        await page.goto("/auth");
        await page.click("text=ログイン");
        await page.fill('input[type="email"]', "test1777258061943@example.com");
        await page.fill('input[type="password"]', "TestPassword123!");
        await Promise.all([
            page.waitForURL("/", { timeout: 30000 }),
            page.click("button[type='submit']")
        ]);

        // 存在しないURLにアクセス
        await page.goto("/invalid-page-12345");

        // ホームへリダイレクト
        await page.waitForURL("/");
        await expect(page.locator("textarea")).toBeVisible();
    });
});
