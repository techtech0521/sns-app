import { test, expect } from "@playwright/test";

test.describe("プロフィール編集機能", () => {
    const testEmail = "test-profile-edit@example.com";
    const testPassword = "TestPassword123!";

    // 各テストの前にログイン＆プロフィール編集ページへ移動
    test.beforeEach(async ({ page }) => {
        await page.goto('/auth');
        await page.click("text=ログイン");
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await Promise.all([
            page.waitForURL("/", { timeout: 30000 }),
            page.click("button[type='submit']")
        ]);

        // プロフィール編集ページへ
        await page.locator('nav a[href="/profile"]').click();
        await page.waitForURL("/profile");
        await page.click('button:has-text("編集")');
        await page.waitForURL("/profile/edit");
    });

    test("アバター画像をアップロードできる", async ({ page }) => {
        // テスト用画像ファイルのパス
        const testImagePath = "fixtures/test-avatar.png";

        // ファイル選択
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testImagePath);

        // プレビューが表示されることを確認
        await expect(page.locator('img[alt="アバター"]')).toBeVisible();

        // 保存ボタンをクリック
        await page.click('button:has-text("保存")');

        // 成功メッセージが表示される
        await expect(page.getByText('保存しました')).toBeVisible({ timeout: 10000 });

        // プロフィールページでアバターが反映されている
        await page.waitForURL("/profile", { timeout: 10000 });
        await expect(page.locator('.w-20.h-20.rounded-full img')).toBeVisible();
    });

    test("ハンドルを変更できる", async ({ page }) => {
        const newHandle = `test_${Date.now().toString().slice(-6)}`;

        // ハンドルを変更
        await page.fill('input[id="handle"]', newHandle);

        // 保存ボタンをクリック
        await page.click('button:has-text("保存")');

        // 成功メッセージが表示される
        await expect(page.getByText('保存しました')).toBeVisible({ timeout: 10000 });

        // プロフィールページでハンドルが反映されている
        await page.waitForURL("/profile", { timeout: 10000 });
        await expect(page.locator(`text=@${newHandle}`).first()).toBeVisible();
    });

    test("自己紹介を変更できる", async ({ page }) => {
        const newBio = "こんにちは！テストユーザーです。";

        // 自己紹介を入力
        await page.fill('textarea[id="bio"]', newBio);

        // 保存ボタンをクリック
        await page.click('button:has-text("保存")');

        // 成功メッセージが表示される
        await expect(page.getByText("保存しました")).toBeVisible({ timeout: 10000 });

        // プロフィールページでbioが反映されている
        await page.waitForURL("/profile", { timeout: 10000 });
        await expect(page.locator(`text=${newBio}`)).toBeVisible();
    });

    test("キャンセルで変更を破棄できる", async ({ page }) => {
        // 変更する表示名
        const changedUsername = `変更後_${Date.now().toString().slice(-6)}`;

        // 表示名を変更
        await page.fill('input[id="username"]', changedUsername);                                                                               
        
        // キャンセルボタンをクリック
        await page.click('button:has-text("キャンセル")');

        // プロフィールページに戻る
        await page.waitForURL("/profile", { timeout: 10000 });

        // 変更は反映されていない（変更後の値が表示されない）                                                                                   
        await expect(page.locator(`text=${changedUsername}`)).not.toBeVisible();
    });

    test("重複したハンドルは保存できない", async ({ page }) => {
        // 既に存在するハンドル（事前に確認しておく）
        const existingHandle = "user_cee0de75";

        // 重複するハンドルを入力
        await page.fill('input[id="handle"]', existingHandle);

        // 保存ボタンをクリック
        await page.click('button:has-text("保存")');

        // エラーメッセージが表示される
        await expect(page.locator('text=このハンドルは既に使用されています')).toBeVisible({ timeout: 5000 });
    });
})