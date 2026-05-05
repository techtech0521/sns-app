import { test, expect } from "@playwright/test";

test.describe("いいね・フォロー・検索機能", () => {
    const testEmail = "test-interactions@example.com";
    const testPassword = "TestPassword123!";

    // 各テストの前にログイン
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

    test("投稿にいいねできる", async ({ page }) => {
        // タイムラインに投稿があることを確認
        await page.waitForSelector("button", { timeout: 10000 });

        // いいねボタンを探す（ハートアイコン）
        const likeButton = page.locator("button").filter({ hasText: /♡|❤️/ }).first();
        await likeButton.waitFor({ timeout: 10000 });

        // 現在のいいね数を取得
        const likeCountBefore = await page.locator('text=/^\\d+$/').first().textContent();

        // いいねボタンをクリック
        await likeButton.click();

        // いいね後のハートが表示される（♡ → ❤️ または ❤️ → ♡）
        await page.waitForTimeout(500); // アニメーション待ち

        // いいね数が変わったことを確認（+1 または -1）
        const likeCountAfter = await page.locator('text=/^\\d+$/').first().textContent();
        expect(likeCountBefore).not.toBe(likeCountAfter);
    });

    test("ユーザー検索ができる", async ({ page }) => {
        // 検索ページに移動
        await page.click("text=検索");
        await page.waitForURL("/search");

        // 検索バーが表示される
        await expect(page.locator('input[placeholder*="検索"]')).toBeVisible();

        // 検索バーに入力
        await page.fill('input[placeholder*="検索"]', 'user');

        // 検索結果が表示される（デバウンス待ち）
        await page.waitForTimeout(500);

        // 検索結果が表示される
        await expect(page.locator('text=/フォロー/i').first()).toBeVisible({ timeout: 5000 });
    });

    test("ユーザーをフォローできる", async ({ page }) => {
        // 検索ページに移動
        await page.click("text=検索");
        await page.waitForURL("/search");

        // ユーザーを検索
        await page.fill('input[placeholder*="検索"]', 'user');
        await page.waitForTimeout(500);

        // フォローボタンが表示されるまで待つ
        const followButton = page.locator('button:has-text("フォローする")').first();
        await followButton.waitFor({ timeout: 10000 });

        // フォローボタンをクリック
        await followButton.click();

        // ボタンが「フォロー中」に変わる
        await expect(page.locator('button:has-text("フォロー中")').first()).toBeVisible({ timeout: 5000 });
    });

    test("フォローを解除できる", async ({ page })=> {
        // 検索ページに移動
        await page.click("text=検索");
        await page.waitForURL("/search");

        // ユーザーを検索
        await page.fill('input[placeholder*="検索"]', 'user');
        await page.waitForTimeout(500);

        // 「フォロー中」ボタンを探す
        const followingButton = page.locator('button:has-text("フォロー中")').first();

        // フォロー中のユーザーがいる場合
        const isFollowing = await followingButton.count() > 0;

        if (isFollowing) {
            await followingButton.click();

            // ボタンが「フォローする」に戻る
            await expect(page.locator('button:has-text("フォローする")').first()).toBeVisible({ timeout: 5000 });
        } else {
            // フォローしてからアンフォロー
            const followButton = page.locator('button:has-text("フォローする")').first();
            await followButton.click();
            await page.waitForTimeout(500);

            const newFollowingButton = page.locator('button:has-text("フォロー中")').first();
            await newFollowingButton.click();

            await expect(page.locator('button:has-text("フォローする")').first()).toBeVisible({ timeout: 5000 });
        }
    });

    test("プロフィールページを表示できる", async ({ page }) => {
        // 検索ページに移動
        await page.click("text=検索");
        await page.waitForURL("/search");

        // ユーザーを検索
        await page.fill('input[placeholder*="検索"]', 'user');
        await page.waitForTimeout(500);

        // 検索結果のユーザー名をクリック
        const userLink = page.locator('a[href^="/users/"]').first();
        await userLink.waitFor({ timeout : 10000 });
        await userLink.click();

        // プロフィールページに遷移
        await page.waitForURL(/\/users\/.+/);

        // プロフィール情報が表示される
        await expect(page.locator('text=@').first()).toBeVisible();
        await expect(page.locator('text=/フォロー/i').first()).toBeVisible();
    });

    test("フォローTLを切り替えられる", async ({ page }) => {
        // ホームページを確認
        await page.goto("/");

        // タブが表示される
        await expect(page.locator('button:has-text("全体")')).toBeVisible();
        await expect(page.locator('button:has-text("フォロー中")')).toBeVisible();

        // フォロー中タブをクリック
        await page.click('button:has-text("フォロー中")');

        // タブがアクティブになる（青い下線）
        const followingTab = page.locator('button:has-text("フォロー中")');
        await expect(followingTab).toHaveClass(/blue|active/);

        // 全体タブに戻る
        await page.click('button:has-text("全体")');

        const allTab = page.locator('button:has-text("全体")');
        await expect(allTab).toHaveClass(/blue|active/);
    });

    test("自分のプロフィールを編集できる", async ({ page }) => {
        // ナビバーのハンドルをクリック
        await page.locator('nav a[href="/profile"]').click();
        await page.waitForURL("/profile");

        // 編集ボンタンをクリック
        await page.click('button:has-text("編集")');
        await page.waitForURL("/profile/edit");

        // 表示名を変更
        const newUsername = `テストユーザー ${Date.now()}`;
        await page.fill('input[id="username"]', newUsername);

        // 保存ボタンをクリック
        await page.click('button:has-text("保存")');

        // 成功メッセージが表示される
        await expect(page.locator('text=/保存しました|成功/i')).toBeVisible({ timeout: 10000 });

        // プロフィールページに戻る
        await page.waitForURL("/profile", { timeout: 10000 });

        // 変更が反映されている
        await expect(page.locator(`text=${newUsername}`)).toBeVisible();
    });
});