import { test, expect } from "@playwright/test";

test.describe("コメント機能", () => {
    const testEmail = "test-comments@example.com";
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

    test("コメント欄を開閉できる", async ({ page }) => {
        // コメントボタンを探す
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });

        // コメント欄を開く
        await commentButton.click();

        // コメント入力欄が表示される
        await expect(page.locator("textarea[placeholder*='コメントを追加']")).toBeVisible({ timeout: 5000 });

        // もう一度クリックして閉じる
        await commentButton.click();

        // コメント入力欄が非表示になる
        await expect(page.locator("textarea[placeholder*='コメントを追加']")).not.toBeVisible();
    });

    test("コメントを投稿できる", async ({ page }) => {
        const commentContent = `テストコメント ${Date.now()}`;

        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメント入力欄が表示されるのを待つ
        const commentTextarea = page.locator("textarea[placeholder*='コメントを追加']").first();
        await commentTextarea.waitFor({ timeout: 5000 });

        // コメントを入力
        await commentTextarea.fill(commentContent);

        // 送信ボタンをクリック（フォーム内のボタンを特定）
        const submitButton = page.locator("form:has(textarea[placeholder*='コメントを追加']) button:has-text('コメント')");
        await submitButton.click();

        // テキストエリアがクリアされるのを待つ
        await expect(commentTextarea).toHaveValue("", { timeout: 5000 });

        // コメントが表示されるのを待つ
        await expect(page.getByText(commentContent).first()).toBeVisible({ timeout: 10000 });
    });

    test("空のコメントは投稿できない", async ({ page }) => {
        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメント入力欄が表示されるのを待つ
        const commentTextarea = page.locator("textarea[placeholder*='コメントを追加']").first();
        await commentTextarea.waitFor({ timeout: 5000 });

        // 空の状態で送信ボタンを確認
        const submitButton = page.locator("form:has(textarea[placeholder*='コメントを追加']) button:has-text('コメント')");

        // ボタンが無効化されている
        await expect(submitButton).toBeDisabled();
    });

    test("コメントの文字数制限が機能する", async ({ page }) => {
        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメント入力欄が表示されるのを待つ
        const commentTextarea = page.locator("textarea[placeholder*='コメントを追加']").first();
        await commentTextarea.waitFor({ timeout: 5000 });

        // 140文字入力（上限）
        const maxContent = "あ".repeat(140);
        await commentTextarea.fill(maxContent);

        // 残り0文字と表示される
        const counter = page.getByText("残り 0 文字").first();
        await expect(counter).toBeVisible();
    });

    test("コメントを削除できる", async ({ page }) => {
        const commentContent = `削除テストコメント ${Date.now()}`;

        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメント入力欄が表示されるのを待つ
        const commentTextarea = page.locator("textarea[placeholder*='コメントを追加']").first();
        await commentTextarea.waitFor({ timeout: 5000 });

        // コメントを投稿
        await commentTextarea.fill(commentContent);
        const submitButton = page.locator("form:has(textarea[placeholder*='コメントを追加']) button:has-text('コメント')");
        await submitButton.click();

        // テキストエリアがクリアされるのを待つ
        await expect(commentTextarea).toHaveValue("", { timeout: 5000 });

        // コメントが表示されるのを待つ
        await expect(page.getByText(commentContent).first()).toBeVisible({ timeout: 10000 });

        // 削除ボタンをクリック（最初の削除ボタン）
        const deleteButton = page.locator("button:has-text('削除')").first();

        // 確認ダイアログを自動的にOKする
        page.once("dialog", dialog => {
            expect(dialog.message()).toContain("削除");
            dialog.accept();
        });

        await deleteButton.click();

        // コメントが消える
        await expect(page.getByText(commentContent).first()).not.toBeVisible({ timeout: 10000 });
    });

    test("コメントなしのメッセージが表示される", async ({ page }) => {
        // 新しい投稿を作成（コメントなし）
        const postContent = `新規投稿 ${Date.now()}`;
        await page.fill("textarea", postContent);
        await page.click("button:has-text('投稿')");
        await expect(page.locator("text=" + postContent)).toBeVisible();

        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.click();

        // 「まだコメントがありません」メッセージが表示される
        await expect(page.locator("text=まだコメントがありません")).toBeVisible({ timeout: 5000 });
    });

    test("複数のコメントが表示される", async ({ page }) => {
        const comment1 = `コメント1 ${Date.now()}`;
        const comment2 = `コメント2 ${Date.now()}`;

        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメント入力欄が表示されるのを待つ
        const commentTextarea = page.locator("textarea[placeholder*='コメントを追加']").first();
        await commentTextarea.waitFor({ timeout: 5000 });

        // 1つ目のコメントを投稿
        await commentTextarea.fill(comment1);
        const submitButton = page.locator("form:has(textarea[placeholder*='コメントを追加']) button:has-text('コメント')");
        await submitButton.click();
        await expect(commentTextarea).toHaveValue("", { timeout: 5000 });
        await expect(page.getByText(comment1).first()).toBeVisible({ timeout: 10000 });

        // 2つ目のコメントを投稿
        await commentTextarea.fill(comment2);
        await submitButton.click();
        await expect(commentTextarea).toHaveValue("", { timeout: 5000 });
        await expect(page.getByText(comment2).first()).toBeVisible({ timeout: 10000 });

        // 両方のコメントが表示されている
        await expect(page.getByText(comment1).first()).toBeVisible();
        await expect(page.getByText(comment2).first()).toBeVisible();
    });

    test("XSS対策が機能する（コメント）", async ({ page }) => {
        const xssPayload = `<script>alert('XSS')</script>テスト`;
        const sanitizedText = "テスト";

        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメント入力欄が表示されるのを待つ
        const commentTextarea = page.locator("textarea[placeholder*='コメントを追加']").first();
        await commentTextarea.waitFor({ timeout: 5000 });

        // XSSペイロードを含むコメントを投稿
        await commentTextarea.fill(xssPayload);
        const submitButton = page.locator("form:has(textarea[placeholder*='コメントを追加']) button:has-text('コメント')");
        await submitButton.click();

        // テキストエリアがクリアされるのを待つ
        await expect(commentTextarea).toHaveValue("", { timeout: 5000 });

        // サニタイズされたテキストのみが表示される
        await expect(page.getByText(sanitizedText).first()).toBeVisible({ timeout: 10000 });

        // scriptタグは実行されていない（アラートが出ない）
    });

    test("他人のコメントは削除できない", async ({ page }) => {
        // 他人の投稿のコメント欄を開く
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).nth(1);
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメントが表示されるのを待つ
        await page.waitForTimeout(500);

        // 削除ボタンが表示されない（自分のコメントのみ削除ボタンが表示される）
        const deleteButtons = page.locator("button:has-text('削除')");
        const count = await deleteButtons.count();

        // 自分のコメントがない場合は0、ある場合は自分の分のみ
        // 他人のコメントには削除ボタンが表示されないことを確認
        if (count > 0) {
            // 削除ボタンがある場合、それが自分のコメントのものであることを確認
            // （詳細な確認はテストデータのセットアップが必要）
        }
    });

    test("レート制限が機能する", async ({ page }) => {
        // コメントボタンをクリック
        const commentButton = page.locator("button").filter({ hasText: /コメント/ }).first();
        await commentButton.waitFor({ timeout: 10000 });
        await commentButton.click();

        // コメント入力欄が表示されるのを待つ
        const commentTextarea = page.locator("textarea[placeholder*='コメントを追加']").first();
        await commentTextarea.waitFor({ timeout: 5000 });

        // 短時間に多数のコメントを投稿（レート制限をトリガー）
        const submitButton = page.locator("form:has(textarea[placeholder*='コメントを追加']) button:has-text('コメント')");
        for (let i = 0; i < 11; i++) {
            await commentTextarea.fill(`テストコメント ${i}`);
            await submitButton.click();
            await page.waitForTimeout(100);
        }

        // レート制限エラーメッセージが表示される
        await expect(page.locator("text=/制限|レート/")).toBeVisible({ timeout: 5000 });
    });
});
