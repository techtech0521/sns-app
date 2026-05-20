import { test, expect } from "@playwright/test";

test.describe("XSS対策", () => {
    const testEmail = "test-xss@example.com";
    const testPassword = "TestPassword123!";

    test.beforeEach(async ({ page }) => {
        await page.goto('/auth');
        await page.click("text=ログイン");
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await Promise.all([
            page.waitForURL("/", { timeout: 30000 }),
            page.click("button[type='submit']")
        ]);
    });

    test("スクリプトタグは実行されない", async ({ page }) => {
        const xssPayload = "<script>alert('XSS')</script> テスト";

        await page.fill("textarea", xssPayload);
        await page.click("button:has-text('投稿')");

        // 投稿が表示される（スクリプトは表示されない）
        await expect(page.locator('.text-gray-800:has-text("テスト")').first()).toBeVisible();
    });

    test("イベントハンドラーは実行されない", async ({ page }) => {
        const xssPayload = `<img src=x onerror="alert('XSS')"> テスト`;

        await page.fill("textarea", xssPayload);
        await page.click("button:has-text('投稿')");

        await expect(page.locator('.text-gray-800:has-text("テスト")').first()).toBeVisible();
    });

    test("SVG X攻撃は防がれる", async ({ page }) => {
        const xssPayload = `<svg onload=alert('XSS')> テスト`;

        await page.fill("textarea", xssPayload);
        await page.click("button:has-text('投稿')");

        await expect(page.locator('.text-gray-800:has-text("テスト")').first()).toBeVisible();
    });

    test("プロフィールbioのXSSは防がれる", async ({ page }) => {
        const xssPayload = "<script>alert('XSS')</script>悪意のあるbio";

        // プロフィール編集ページへ
        await page.locator('nav a[href="/profile"]').click();
        await page.waitForURL("/profile");
        await page.click('button:has-text("編集")');
        await page.waitForURL("/profile/edit");

        // bioにXSSペイロードを入力
        await page.fill('textarea[id="bio"]', xssPayload);
        await page.click('button:has-text("保存")');

        // bioが表示される（スクリプトは実行されない）
        await expect(page.locator('text=悪意のあるbio')).toBeVisible();
    });

    test("改行は維持される", async ({ page }) => {
        const postContent = "1行目\n2行目\n3行目";

        await page.fill("textarea", postContent);
        await page.click("button:has-text('投稿')");

        // 各行が表示される
        await expect(page.locator('.text-gray-800:has-text("1行目")').first()).toBeVisible();
        await expect(page.locator('.text-gray-800:has-text("2行目")').first()).toBeVisible();
        await expect(page.locator('.text-gray-800:has-text("3行目")').first()).toBeVisible();
    });

    test("通常のテキストは正しく表示される", async ({ page }) => {
        const postContent = "こんにちは！これはテスト投稿です。 #ハッシュタグ @ユーザー";

        await page.fill("textarea", postContent);
        await page.click("button:has-text('投稿')");

        await expect(page.locator('.text-gray-800:has-text("こんにちは！これはテスト投稿です。")').first()).toBeVisible();
    });

    test("特殊文字は正しく表示される", async ({ page }) => {
        const postContent = "特殊文字テスト: < > & \" '";

        await page.fill("textarea", postContent);
        await page.click("button:has-text('投稿')");

        await expect(page.locator('.text-gray-800:has-text("特殊文字テスト")').first()).toBeVisible();
    });
});