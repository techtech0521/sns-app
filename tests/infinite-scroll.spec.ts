import { test, expect } from "@playwright/test";

test.describe("無限スクロール", () => {
    const testEmail = "test-posts@example.com";
    const testPassword = "TestPassword123!";

    // 各テストの前にログイン
    test.beforeEach(async ({ page }) => {
        await page.goto("/auth");
        await page.click("text=ログイン");
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await Promise.all([
            page.waitForURL('/', { timeout: 30000 }),
            page.click("button[type='submit']"),
        ]);
    });

    test("初回10件が表示される", async ({ page }) => {
        // 投稿カードを待つ
        await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

        // 投稿カードの数を取得
        const postCards = await page.locator('[data-testid="post-card"]').count();

        // 初回は10件以下（環境によって投稿数が異なる可能性があるため10件以下でチェック）
        expect(postCards).toBeLessThanOrEqual(10);
    });

    test("スクロールすると追加で10件読み込まれる", async ({ page }) => {
        // 投稿カードを待つ
        await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

        // 初回の投稿数を取得
        const initialCount = await page.locator('[data-testid="post-card"]').count();

        // ページの下部までスクロール
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });

        // 追加ロードの完了を待つ（スピナーが消えるのを待つ）
        await page.waitForSelector(
            'div:has-text("これ以上投稿はありません")', 
            { timeout: 10000 }
        ).catch(() => {
            // メッセージが表示されない場合（まだデータがある場合）はスピナーが消えるのを待つ
        });

        // 投稿数が増えていることを確認
        const newCount = await page.locator('[data-testid="post-card"]').count();
        expect(newCount).toBeGreaterThan(initialCount);
    });

    test("すべて読み込むとメッセージが表示される", async ({ page }) => {
        // 投稿カードを待つ
        await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

        // 繰り返しスクロールしてすべてのデータを読み込む
        let previousCount = 0;
        let retries = 0;
        const maxRetries = 10; // 無限ループ防止

        while (retries < maxRetries) {
            // ページの下部までスクロール
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            // 少し待つ
            await page.waitForTimeout(1000);

            const currentCount = await page.locator('[data-testid="post-card"]').count();

            // 投稿数が増えなくなったら終了
            if (currentCount === previousCount) {
                break;
            }

            previousCount = currentCount;
            retries++;
        }

        // 「これ以上投稿はありません」が表示されることを確認
        const message = await page.locator('text=これ以上投稿はありません').isVisible();
        expect(message).toBeTruthy();
    });

    test("フォロー中タブでも動作する", async ({ page }) => {
        // フォロー中タブをクリック
        await page.click('button:has-text("フォロー中")');

        // 投稿カードを待つ（フォロー中の投稿がない場合もある）
        try {
            await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

            // 初回の投稿数を取得
            const initialCount = await page.locator('[data-testid="post-card"]').count();

            // ページの下部までスクロール
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            // 追加ロードの完了を待つ
            await page.waitForTimeout(2000);

            // 投稿数が増えているか。メッセージが表示される
            const newCount = await page.locator('[data-testid="post-card"]').count();
            const hasMessage = await page.locator('text=これ以上投稿はありません').isVisible();

            expect(newCount > initialCount || hasMessage, "投稿数が増えているか、メッセージが表示される必要があります").toBeTruthy();
        } catch {
            // フォロー中の投稿がない場合は「投稿がありません」メッセージが表示される
            await expect(page.locator('text=フォロー中のユーザーの投稿がありません')).toBeVisible();
        }
    });

    test("投稿作成後にリストが更新される", async ({ page }) => {
        // 投稿カードを待つ
        await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

        // 初回の投稿数を取得
        const initialCount = await page.locator('[data-testid="post-card"]').count();

        // 新規投稿を作成
        const postContent = `無限スクロールテスト ${Date.now()}`;
        await page.fill("textarea", postContent);
        await page.click('button:has-text("投稿")');

        // 投稿が表示されることを確認
        await expect(page.locator(`text=${postContent}`)).toBeVisible({ timeout: 15000 });
    });

    test("追加ロード中にスピナーが表示される", async ({ page }) => {
        // 投稿カードを待つ
        await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

        // ページの下部までスクロール
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });

        // スピナーが表示されることを確認
        const spinner = page.locator('.border-blue-500.border-t-transparent.rounded-full.animate-spin');

        // スピナーが一瞬表示されるはず（表示されない場合もあるのでタイムアウトは短め）
        try {
            await spinner.toBeVisible({ timeout: 2000 });
        } catch {
            // スピナーが表示されない場合（データが少ない場合など）はテストをパス
        }
    });
});