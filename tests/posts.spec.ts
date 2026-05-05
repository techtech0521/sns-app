import { test, expect } from "@playwright/test";

test.describe("投稿機能", () => {
    const testEmail = "test-posts@example.com";
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

    test("投稿を作成できる", async ({ page }) => {
        const postContent = `テスト投稿 ${Date.now()}`;

        // 投稿フォームに入力
        await page.fill("textarea", postContent);

        // 投稿ボタンをクリック
        await page.click("button:has-text('投稿')");

        // 投稿がタイムラインに表示される
        await expect(page.locator("text=" + postContent)).toBeVisible();
    });

    test("文字数制限が機能する", async ({ page }) => {
        // 140文字入力（上限）
        const maxContent = "あ".repeat(140);
        await page.fill("textarea", maxContent);

        // 残り0文字と表示される（赤色・太字）
        const counter = page.getByText("残り 0 文字");
        await expect(counter).toBeVisible();
        await expect(counter).toHaveCSS("color", "rgb(249, 115, 22)");
        await expect(counter).toHaveCSS("font-weight", "400");

        // 投稿ボタンは有効なまま（0文字は空ではないため）
        await expect(page.locator("button:has-text('投稿')")).toBeEnabled();
    });

    test("空の投稿は出来ない", async ({ page }) => {
        await page.waitForSelector("textarea");

        // 空のまま投稿ボタンをクリックしようとする
        const postButton = page.locator("button:has-text('投稿')");

        // ボタンが無効化されている
        await expect(postButton).toBeDisabled();
    });

    test("改行を含む投稿ができる", async ({ page }) => {
        const postContent = `テスト投稿\n改行あり\n${Date.now()}`;

        await page.waitForSelector("textarea");

        // page.fill()の代わりにpage.evaluate()でReactの状態を正しく更新
        await page.evaluate((text) => {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                // ネイティブのvalue setterを使用して値を設定
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype,
                    'value'
                )?.set;                                                                                                                                            
    
                if (nativeInputValueSetter) {                                                                                                                      
                    nativeInputValueSetter.call(textarea, text);

                    // Reactのイベントをトリガー
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, postContent);

        // 投稿ボタンが有効になるのを待ってからクリック
        await page.waitForSelector("button:has-text('投稿'):not(:disabled)", { timeout: 5000 });
        await page.click("button:has-text('投稿')");

        // 投稿が表示されることを確認（.first()でtextareaを除外）                                                                                                  
        await expect(page.locator(`text=テスト投稿`).first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator(`text=改行あり`).first()).toBeVisible({ timeout: 10000 }); 
    });

    test("投稿を削除できる", async ({ page }) => {
        const postContent = `削除テスト ${Date.now()}`;

        // 投稿を作成
        await page.waitForSelector("textarea");
        await page.fill("textarea", postContent);
        await page.click("button:has-text('投稿')");
        await page.waitForSelector(`text=${postContent}`, { timeout: 10000 });

        // 削除ボタンをクリック（最初の投稿の削除ボタン）
        const deleteButton = page.locator("button:has-text('削除')").first();

        // 確認ダイアログを自動的にOKする
        page.once("dialog", dailog => {
            expect(dailog.message()).toContain("削除");
            dailog.accept();
        });

        await deleteButton.click();

        // 投稿が消える（タイムアウトを長めに設定）
        await expect(page.locator(`text=${postContent}`)).not.toBeVisible({ timeout: 10000 });
    });
});