# Playwrightテスト - 理解度チェックテスト

このテストは、今回のトラブルシューティングで得た知識の理解度を確認するためのものです。

---

## 問題1: タイムアウトの設定

以下のテストコードがありますが、何が問題でしょうか？

```typescript
test('サインアップテスト', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    await Promise.all([
        page.waitForURL("/", { timeout: 60000 }),
        page.click("text=新規登録")
    ]);
});
```

<details>
<summary>回答</summary>

`page.waitForURL` に 60000ms を設定していますが、**テスト全体のタイムアウト（デフォルト30000ms）**が先に発生します。

解決策：
```typescript
test.setTimeout(90000); // テスト全体のタイムアウトを延長

test('サインアップテスト', async ({ page }) => {
    // ...
});
```
</details>

---

## 問題2: ボタンがクリックされない

以下のテストを実行すると、ボタンがクリックされずにサインアップが進みません。なぜでしょうか？

**AuthPage.tsx**:
```typescript
<button type='submit' disabled={loading}>
    {loading ? '処理中...' : isLogin ? 'ログイン' : '新規登録'}
</button>
```

**テスト**:
```typescript
await page.click("text=新規登録");  // 送信ボタンをクリックしようとしている
```

<details>
<summary>回答</summary>

デフォルトで `isLogin = true`（ログインタブが選択）の状態では、ボタンのテキストは「ログイン」となります。そのため、`text=新規登録` というセレクタではボタンが見つかりません。

解決策：新規登録タブを先にクリックする
```typescript
// 新規登録タブをクリック
await page.click("text=新規登録");  // タブの方

// その後、送信ボタンをクリック
await page.click("button[type='submit']");  // セレクタを変更
```
</details>

---

## 問題3: デバッグ方法

サインアップボタンをクリックした後、何も起こらないように見えます。どのようにデバッグしますか？

<details>
<summary>回答</summary>

```typescript
// クリック後に少し待つ
await page.click("button[type='submit']");
await page.waitForTimeout(2000);

// 現在のURLを確認
console.log('現在のURL:', page.url());

// エラーメッセージがあるか確認
const errorLocator = page.locator('.error-message');
const hasError = await errorLocator.count();
console.log('エラー:', hasError > 0);

// 成功メッセージがあるか確認
const successLocator = page.locator('.success-message');
console.log('成功:', await successLocator.count() > 0);
```
</details>

---

## 問題4: waitForURLの使い方

以下の2つのコードの違いは何ですか？

**A**:
```typescript
await page.click("button[type='submit']");
await page.waitForURL("/");
```

**B**:
```typescript
await Promise.all([
    page.waitForURL("/"),
    page.click("button[type='submit']")
]);
```

<details>
<summary>回答</summary>

**A**（順次実行）: クリック処理が完了してから `waitForURL` の監視が開始されます。クリック後すぐにナビゲーションが開始される場合、URL変更を見逃す可能性があります。

**B**（同時実行）: クリックと同時に `waitForURL` の監視を開始するため、ナビゲーションを確実に捕捉できます。**こちらが推奨される方法**です。
</details>

---

## 問題5: 実践問題

以下の要件を満たすテストコードを書いてください：

1. `/auth` ページに移動
2. 新規登録タブをクリック
3. メールアドレスとパスワードを入力
4. 送信ボタンをクリックし、ホームページへのリダイレクトを待機
5. テスト全体のタイムアウトを90秒に設定

<details>
<summary>回答</summary>

```typescript
import { test, expect } from '@playwright/test';

test.setTimeout(90000);

test('新規登録テスト', async ({ page }) => {
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    await page.goto('/auth');

    // 新規登録タブをクリック
    await page.click("text=新規登録");

    // 入力フォームを埋める
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // 送信ボタンをクリックし、リダイレクトを待機
    await Promise.all([
        page.waitForURL("/", { timeout: 60000 }),
        page.click("button[type='submit']")
    ]);

    console.log('✅ テスト成功');
});
```
</details>
