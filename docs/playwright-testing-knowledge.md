# Playwright E2Eテスト - 知見まとめ & 理解度チェック

作成日: 2026-05-05

---

# パート1: Playwright E2Eテスト 知見まとめ

## 1. 基本概念とセットアップ

### Playwrightとは
- Microsoftが開発するE2Eテストフレームワーク
- Chromium、Firefox、WebKit（Safari）を同じAPIで操作可能
- 高速で並列実行可能
- TypeScriptをフルサポート

### セットアップ手順
```bash
npm install -D @playwright/test
npx playwright install
```

### 基本設定（playwright.config.ts）
```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 2. テスト構造のパターン

### 基本的なテスト構造
```typescript
import { test, expect } from "@playwright/test";

test.describe("機能グループ名", () => {
  // 前処理（各テスト前に実行）
  test.beforeEach(async ({ page }) => {
    // ログイン処理など
  });

  test("テストケース名", async ({ page }) => {
    // 1. 準備（Arrange）
    await page.goto("/path");

    // 2. 実行（Act）
    await page.click("button");
    await page.fill("input", "value");

    // 3. 検証（Assert）
    await expect(page.locator("element")).toBeVisible();
  });
});
```

### テストファイルの分割例
```
tests/
├── auth.spec.ts         # 認証機能
├── posts.spec.ts        # 投稿機能
├── interactions.spec.ts # いいね・フォロー・検索
└── simple.spec.ts       # 基本的な動作確認
```

---

## 3. よく使うAPI・セレクタ

### セレクタの種類

| セレクタ | 例 | 説明 |
|---------|-----|------|
| テキスト | `page.locator("text=ログイン")` | テキスト内容で検索 |
| CSS | `page.locator("button.submit")` | CSSセレクタ |
| Role | `page.getByRole("button", { name: "送信" })` | アクセシビリティ重視 |
| Label | `page.getByLabel("メールアドレス")` | フォームラベル |
| Placeholder | `page.getByPlaceholder("検索")` | プレースホルダー |
| Alt text | `page.getByAltText("アバター")` | 画像のalt属性 |

### よく使うPage API

```typescript
// ナビゲーション
await page.goto("/path");
await page.waitForURL("/expected-path");

// 入力操作
await page.fill("input", "value");
await page.click("button");
await page.selectOption("select", "value");

// 情報取得
const text = await page.locator("element").textContent();
const count = await page.locator("item").count();

// 待機
await page.waitForSelector(".loaded");
await page.waitForTimeout(500); // 可能な限り避ける

// ダイアログ
page.once("dialog", dialog => {
  dialog.accept(); // または dialog.dismiss()
});
```

### よく使うAssertion

```typescript
// 表示状態
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();

// 状態
await expect(button).toBeEnabled();
await expect(button).toBeDisabled();

// テキスト・属性
await expect(locator).toHaveText("expected");
await expect(locator).toHaveAttribute("href", "/path");

// CSS
await expect(element).toHaveCSS("color", "rgb(0, 0, 0)");

// URL
await expect(page).toHaveURL("/expected-path");
```

---

## 4. ハマりやすいポイントと解決策

### 4.1 Reactの状態が更新されない

**問題**: `page.fill()` で値を入れてもReactの状態が変わらない

**解決策**: ネイティブのsetterを使用してイベントをトリガー
```typescript
await page.evaluate((text) => {
  const textarea = document.querySelector('textarea');
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;
  if (setter) {
    setter.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, postContent);
```

### 4.2 アサーションがtextarea自身にヒットする

**問題**: 投稿後のテキスト検索が入力フォームに引っかかる

**解決策**: `.first()` で最初の要素を指定
```typescript
await expect(page.locator("text=投稿内容").first()).toBeVisible();
```

### 4.3 非同期処理の競合

**問題**: ナビゲーションと次の操作が競合する

**解決策**: `Promise.all()` で並列待機
```typescript
await Promise.all([
  page.waitForURL("/", { timeout: 30000 }),
  page.click("button[type='submit']")
]);
```

### 4.4 デバウンス待ち

**問題**: 検索などで結果が反映される前にテストが進む

**解決策**: 適切な待機時間を設定
```typescript
await page.fill('input[placeholder*="検索"]', 'query');
await page.waitForTimeout(500); // デバウンス待ち
await expect(results).toBeVisible();
```

### 4.5 ダイアログハンドラーの重複

**問題**: 複数回クリックするとダイアログハンドラーが重複登録される

**解決策**: `page.once()` を使用
```typescript
page.once("dialog", dialog => {
  expect(dialog.message()).toContain("削除");
  dialog.accept();
});
```

### 4.6 Strict Mode Violation（複数の要素がマッチ）

**問題**: 同じテキストやセレクタを持つ要素が複数あるとエラー
```
Error: strict mode violation: locator('text=@username') resolved to 2 elements
```

**解決策**: `.first()` で最初の要素を選択、またはより具体的なセレクタを使用
```typescript
// 解決策1: first()を使用
await expect(page.locator('text=@username').first()).toBeVisible();

// 解決策2: より具体的なセレクタ
await expect(page.locator('.text-gray-500').getByText('@username')).toBeVisible();

// 解決策3: getByText()の代わりにlocator()を使用
await expect(page.getByText('ホーム').first()).toBeVisible();
```

### 4.7 Playwrightのセレクタ構文の誤り

**問題**: `text=/正規表現/i` 形式が正しく機能しない
```typescript
// ❌ 動作しない
await expect(page.locator('text=/保存しました|成功/i')).toBeVisible();
await expect(page.locator('text=/^\\d+$/')).toBeVisible();
```

**解決策**: 推奨されるロケーターAPIを使用
```typescript
// ✅ 正しい書き方
await expect(page.getByText('保存しました')).toBeVisible();
await expect(page.locator('text').filter({ hasText: /\d+/ }).first()).toBeVisible();

// テキストの完全一致
await expect(page.getByText('特定のテキスト', { exact: true })).toBeVisible();
```

### 4.8 値の長さ制限を考慮したテストデータ生成

**問題**: `Date.now()` を使うと制限を超える可能性がある
```typescript
// ❌ ハンドルの20文字制限を超える
const handle = `test_user_${Date.now()}`; // 23文字になる
```

**解決策**: タイムスタンプを短縮または乱数を使用
```typescript
// ✅ タイムスタンプの下6桁を使用
const handle = `test_${Date.now().toString().slice(-6)}`; // 10文字

// ✅ 乱数を使用
const handle = `test_${Math.floor(Math.random() * 100000)}`; // 最大10文字

// ✅ 36進数で短縮
const handle = `test_${Date.now().toString(36)}`; // 9-10文字
```

### 4.9 空の値によるセレクタの問題

**問題**: `inputValue()` が空文字列の場合、セレクタがすべての要素にマッチ
```typescript
// ❌ originalUsername が空の場合、text= は全テキストにマッチ
const originalUsername = await page.locator('input').inputValue();
await expect(page.locator(`text=${originalUsername}`)).toBeVisible();
// Error: strict mode violation: locator('text=') resolved to 20 elements
```

**解決策**: 変更後の値が表示されないことを確認するアプローチに変更
```typescript
// ✅ 変更後の値が表示されないことを確認
const changedUsername = `変更後_${Date.now().toString().slice(-6)}`;
await page.fill('input', changedUsername);
await page.click('button:has-text("キャンセル")');
await expect(page.locator(`text=${changedUsername}`)).not.toBeVisible();
```

---

## 5. ベストプラクティス

### 5.1 データの分離
```typescript
// 各テストで一意のデータを使用
const testEmail = `test${Date.now()}@example.com`;
```

### 5.2 再利用可能なログイン処理
```typescript
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
```

### 5.3 適切なタイムアウト設定
```typescript
await page.waitForURL("/", { timeout: 30000 }); // 初期ロードは長めに
await expect(element).toBeVisible({ timeout: 10000 }); // 通常はデフォルトでOK
```

### 5.4 ロケーターは`page.locator()` を使用
```typescript
// 推奨
const button = page.locator("button:has-text('送信')");

// 非推奨（古いAPI）
const button = await page.$("button");
```

### 5.5 テストデータのクリーンアップ
```typescript
test.afterEach(async ({ page }) => {
  // テスト後の状態をリセット
  await page.click("text=ログアウト");
});
```

---

# パート2: 理解度チェックテスト

## セクションA: 基礎知識クイズ（5問）

### Q1. Playwrightでテストを記述する際、適切なインポート文は？
```
a) import { test, check } from "@playwright/test";
b) import { test, expect } from "@playwright/test";
c) import { describe, it, assert } from "@playwright/test";
d) import { suite, spec } from "@playwright/test";
```

### Q2. 以下のセレクタのうち、アクセシビリティを考慮した推奨される書き方は？
```
a) page.locator("div.btn-primary")
b) page.locator("button.submit-btn")
c) page.getByRole("button", { name: "送信" })
d) page.$("button")
```

### Q3. `test.beforeEach()` の役割は？
```
a) 全てのテストの前に1回だけ実行される
b) 各テストの前に実行される
c) 全てのテストの後に1回だけ実行される
d) 各テストの後に実行される
```

### Q4. Reactアプリで`page.fill()`後に状態が更新されない問題の解決策は？
```
a) page.waitForTimeout() を長く設定する
b) page.evaluate() でネイティブsetterを使用し、イベントを発火
c) page.reload() でページを再読み込み
d) setValue() メソッドを使用する
```

### Q5. Playwrightの設定で、テスト失敗時のみスクリーンショットを保存する設定は？
```
a) screenshot: 'always'
b) screenshot: 'only-on-failure'
c) screenshot: 'on-error'
d) screenshot: true
```

### Q6. Strict Mode Violationエラーの原因は何ですか？
```
a) セレクタが正しく書かれていない
b) ページが読み込まれていない
c) 同じセレクタに一致する要素が複数ある
d) タイムアウト時間が短すぎる
```

### Q7. 以下のセレクタのうち、正しい書き方はどれですか？
```
a) page.locator('text=/保存しました|成功/i')
b) page.locator('text=/^\\d+$/')
c) page.getByText('保存しました')
d) page.locator('text=\\d+')
```

### Q8. ハンドル（ユーザーID）が20文字以下という制限がある場合、どのような実装が適切ですか？
```
a) const handle = `user_${Date.now()}`;
b) const handle = `user_${Math.random()}`;
c) const handle = `user_${Date.now().toString().slice(-6)}`;
d) const handle = `user`;
```

---

## セクションB: 実践問題（3問）

### 問題1: ログインテストの実装

以下の要件を満たすテストコードを完成させてください：

```typescript
test("ログインができる", async ({ page }) => {
  // 1. 認証ページにアクセス
  await page.goto("_____");

  // 2. ログインタブをクリック
  await page.click("_____");

  // 3. メールアドレスを入力
  await page.fill("_____", "test@example.com");

  // 4. パスワードを入力
  await page.fill("_____", "Password123!");

  // 5. 送信ボタンをクリックし、ホーム画面へ遷移するのを待つ
  await Promise.all([
    _____,
    page.click("button[type='submit']")
  ]);

  // 6. ナビバーにハンドルが表示されることを確認
  await expect(page.locator("_____")).toContainText("@");
});
```

### 問題2: 投稿削除のテスト

以下の要件で投稿削除のテストを記述してください：

**要件**:
1. テキストエリアに「削除テスト」と入力
2. 投稿ボタンをクリック
3. 投稿が表示されるのを待つ
4. 削除ボタンをクリック（確認ダイアログをOKする）
5. 投稿が消えることを確認

```typescript
test("投稿を削除できる", async ({ page }) => {
  // 実装してください
});
```

### 問題3: フォローボタンのテスト

検索ページでユーザーを検索し、フォローするテストを記述してください。

**要件**:
1. 検索ページに移動
2. 検索バーに「user」と入力
3. 検索結果が表示されるのを待つ（デバウンス500ms）
4. 「フォローする」ボタンをクリック
5. 「フォロー中」ボタンに変わることを確認

```typescript
test("ユーザーをフォローできる", async ({ page }) => {
  // 実装してください
});
```

---

# パート3: 回答・解説

## セクションA: 基礎知識クイズの解答

| 問題 | 正解 | 解説 |
|------|------|------|
| Q1 | **b** | `test` と `expect` がPlaywrightの基本API |
| Q2 | **c** | `getByRole()` はアクセシビリティを考慮した推奨される書き方 |
| Q3 | **b** | `beforeEach` は各テストの前に実行される |
| Q4 | **b** | Reactの状態を正しく更新するには、ネイティブsetterとイベント発火が必要 |
| Q5 | **b** | `screenshot: 'only-on-failure'` が正しい設定値 |
| Q6 | **c** | 同じセレクタに一致する要素が複数あるとStrict Mode Violationエラーになる |
| Q7 | **c** | `getByText()` は推奨される正しい書き方。`text=/正規表現/i` は機能しない |
| Q8 | **c** | `Date.now().toString().slice(-6)` で6桁に短縮し、20文字制限内に収める |

---

## セクションB: 実践問題の解答

### 問題1の解答

```typescript
test("ログインができる", async ({ page }) => {
  // 1. 認証ページにアクセス
  await page.goto("/auth");

  // 2. ログインタブをクリック
  await page.click("text=ログイン");

  // 3. メールアドレスを入力
  await page.fill('input[type="email"]', "test@example.com");

  // 4. パスワードを入力
  await page.fill('input[type="password"]', "Password123!");

  // 5. 送信ボタンをクリックし、ホーム画面へ遷移するのを待つ
  await Promise.all([
    page.waitForURL("/", { timeout: 30000 }),
    page.click("button[type='submit']")
  ]);

  // 6. ナビバーにハンドルが表示されることを確認
  await expect(page.locator('nav')).toContainText("@");
});
```

### 問題2の解答

```typescript
test("投稿を削除できる", async ({ page }) => {
  const postContent = "削除テスト";

  // 投稿を作成
  await page.waitForSelector("textarea");
  await page.fill("textarea", postContent);
  await page.click("button:has-text('投稿')");
  await page.waitForSelector(`text=${postContent}`, { timeout: 10000 });

  // 削除ボタンをクリック
  const deleteButton = page.locator("button:has-text('削除')").first();

  // 確認ダイアログを自動的にOKする
  page.once("dialog", dialog => {
    expect(dialog.message()).toContain("削除");
    dialog.accept();
  });

  await deleteButton.click();

  // 投稿が消えることを確認
  await expect(page.locator(`text=${postContent}`)).not.toBeVisible({ timeout: 10000 });
});
```

### 問題3の解答

```typescript
test("ユーザーをフォローできる", async ({ page }) => {
  // 検索ページに移動
  await page.click("text=検索");
  await page.waitForURL("/search");

  // ユーザーを検索
  await page.fill('input[placeholder*="検索"]', 'user');
  await page.waitForTimeout(500); // デバウンス待ち

  // フォローボタンをクリック
  const followButton = page.locator('button:has-text("フォローする")').first();
  await followButton.waitFor({ timeout: 10000 });
  await followButton.click();

  // 「フォロー中」ボタンに変わることを確認
  await expect(page.locator('button:has-text("フォロー中")').first()).toBeVisible({ timeout: 5000 });
});
```

---

## 学習チェックリスト

このドキュメントを読んで以下が理解できたら、E2Eテストの基礎はマスターです：

- [ ] Playwrightの基本設定が理解できた
- [ ] テストの構造（Arrange-Act-Assert）を理解した
- [ ] よく使うセレクタ（text、CSS、Role）を使い分けられる
- [ ] よく使うAPI（goto、fill、click、waitForURL）を覚えた
- [ ] ハマりやすいポイントと解決策を理解した
- [ ] 基礎知識クイズで合格点を取れた
- [ ] 実践問題を自分で書けるようになった
- [ ] Strict Mode Violationの対処法を理解した
- [ ] Playwrightの正しいセレクタ構文を覚えた
- [ ] 値の長さ制限を考慮したテストデータを生成できる
- [ ] 空の値によるセレクタ問題を回避できる

---

## さらなる学習リソース

- [Playwright公式ドキュメント](https://playwright.dev/docs/intro)
- [Playwrightベストプラクティス](https://playwright.dev/docs/best-practices)
- [Playwright GitHub](https://github.com/microsoft/playwright)
