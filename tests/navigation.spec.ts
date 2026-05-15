import { test, expect } from "@playwright/test";

test.describe("ナビゲーション", () => {
    const testEmail = "test-nav@example.com";
    const testPassword = "TestPassword123!";

    test.beforeEach(async ({ page }) => {
        await page.goto("/auth");
        await page.click("text=ログイン");
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await Promise.all([
            page.waitForURL("/", { timeout: 30000 }),
            page.click("button[type='submit']")
        ]);
    });

    test("ホームボタンでホームページへ遷移", async ({ page }) => {
        // 他のページに移動してから
        await page.click("text=検索");
        await page.waitForURL("/search");

        // ホームボタンをクリック
        await page.click('nav a[href="/"]');

        // ホームページに遷移
        await page.waitForURL("/");
        await expect(page.locator("textarea")).toBeVisible();
    });

    test("検索ボタンで検索ページへ遷移", async ({ page }) => {
        await page.click("text=検索");

        await page.waitForURL("/search");
        await expect(page.locator('input[placeholder*="検索"]')).toBeVisible();
    });

    test("プロフィールボタンでプロフィールページへ遷移", async ({ page }) => {
        await page.locator('nav a[href="/profile"]').click();

        await page.waitForURL("/profile");
        await expect(page.locator('text=@').first()).toBeVisible();
    });

    test("ログアウトボタンで認証ページへ遷移", async ({ page }) => {
        await page.click("text=ログアウト");

        await page.waitForURL("/auth");
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });
})