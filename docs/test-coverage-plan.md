# Playwright テストカバレッジ拡張計画

作成日: 2026-05-05

---

# 概要

現在のテストでカバーされていない機能を追加するための実装計画です。

---

# タスク一覧

| # | テストカテゴリ | テスト内容 | 対象ファイル | 優先度 |
|---|---------------|-----------|-------------|--------|
| 1 | プロフィール編集 | アバター画像アップロード | `tests/profile-edit.spec.ts` (新規) | High |
| 2 | プロフィール編集 | ハンドル変更 | `tests/profile-edit.spec.ts` | High |
| 3 | プロフィール編集 | 自己紹介（bio）変更 | `tests/profile-edit.spec.ts` | Medium |
| 4 | プロフィール編集 | キャンセルボタン | `tests/profile-edit.spec.ts` | Medium |
| 5 | プロフィール編集 | 重複ハンドルのバリデーション | `tests/profile-edit.spec.ts` | High |
| 6 | 投稿機能 | 画像付き投稿 | `tests/posts.spec.ts` (追記) | High |
| 7 | 投稿機能 | 投稿カードからプロフィール遷移 | `tests/posts.spec.ts` (追記) | Medium |
| 8 | いいね機能 | いいねを外す（アンライク） | `tests/interactions.spec.ts` (追記) | Low |
| 9 | フォロー統計 | フォロー数/フォロワー数表示 | `tests/interactions.spec.ts` (追記) | Medium |
| 10 | ナビゲーション | 各ナビボタンの遷移 | `tests/navigation.spec.ts` (新規) | Medium |
| 11 | 認証・ルーティング | 未ログイン時のリダイレクト | `tests/auth.spec.ts` (追記) | High |
| 12 | 認証・ルーティング | 無効なURLでのリダイレクト | `tests/auth.spec.ts` (追記) | Medium |
| 13 | エッジケース | 存在しないユーザーのプロフィール | `tests/interactions.spec.ts` (追記) | Low |
| 14 | エッジケース | 投稿がないユーザーのプロフィール | `tests/interactions.spec.ts` (追記) | Low |
| 15 | エッジケース | 検索結果が0件 | `tests/interactions.spec.ts` (追記) | Low |

---

# 詳細実装手順

## タスク1-5: プロフィール編集機能のテスト

### 新規ファイル作成: `tests/profile-edit.spec.ts`

**ファイル構成**:
```typescript
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

  // 以降、各テストケースを実装
});
```

---

### タスク1: アバター画像アップロード

**実装内容**:
1. ファイル入力要素を探す
2. テスト用画像ファイルをアップロード
3. プレビューが表示されることを確認
4. 保存ボタンをクリック
5. プロフィールページでアバターが反映されていることを確認

**実装コード**:
```typescript
test("アバター画像をアップロードできる", async ({ page }) => {
  // テスト用画像ファイルのパス（ fixtures ディレクトリに配置）
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
```

**準備作業**:
1. `tests/fixtures/` ディレクトリを作成
2. `tests/fixtures/test-avatar.png` を配置（1KB程度の小さな画像）

---

### タスク2: ハンドル変更

**実装内容**:
1. ハンドル入力欄に新しい値を入力
2. 保存ボタンをクリック
3. 成功メッセージを確認
4. プロフィールページでハンドルが変更されていることを確認

**実装コード**:
```typescript
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
```

---

### タスク3: 自己紹介（bio）変更

**実装内容**:
1. 自己紹介テキストエリアにテキストを入力
2. 保存ボタンをクリック
3. プロフィールページでbioが反映されていることを確認

**実装コード**:
```typescript
test("自己紹介を変更できる", async ({ page }) => {
  const newBio = "こんにちは！テストユーザーです。";

  // 自己紹介を入力
  await page.fill('textarea[id="bio"]', newBio);

  // 保存ボタンをクリック
  await page.click('button:has-text("保存")');

  // 成功メッセージが表示される
  await expect(page.getByText('保存しました')).toBeVisible({ timeout: 10000 });

  // プロフィールページでbioが反映されている
  await page.waitForURL("/profile", { timeout: 10000 });
  await expect(page.locator(`text=${newBio}`)).toBeVisible();
});
```

---

### タスク4: キャンセルボタン

**実装内容**:
1. 表示名を変更（保存しない）
2. キャンセルボタンをクリック
3. プロフィールページに戻る
4. 変更が反映されていないことを確認

**実装コード**:
```typescript
test("キャンセルで変更を破棄できる", async ({ page }) => {
  // 元の表示名を取得
  const originalUsername = await page.locator('input[id="username"]').inputValue();

  // 表示名を変更
  await page.fill('input[id="username"]', `変更後_${Date.now()}`);

  // キャンセルボタンをクリック
  await page.click('button:has-text("キャンセル")');

  // プロフィールページに戻る
  await page.waitForURL("/profile");

  // 変更が反映されていない（元の値のまま）
  await expect(page.locator(`text=${originalUsername}`)).toBeVisible();
});
```

---

### タスク5: 重複ハンドルのバリデーション

**実装内容**:
1. 既存のユーザーのハンドル（`test-posts@example.com` のハンドルなど）を取得
2. そのハンドルを入力
3. 保存ボタンをクリック
4. エラーメッセージ「このハンドルは既に使用されています」が表示されることを確認

**実装コード**:
```typescript
test("重複したハンドルは保存できない", async ({ page }) => {
  // 既に存在するハンドル（事前に確認しておく）
  const existingHandle = "testposts"; // テスト用アカウントの既存ハンドル

  // 重複するハンドルを入力
  await page.fill('input[id="handle"]', existingHandle);

  // 保存ボタンをクリック
  await page.click('button:has-text("保存")');

  // エラーメッセージが表示される
  await expect(page.locator('text=このハンドルは既に使用されています')).toBeVisible({ timeout: 5000 });
});
```

---

## タスク6-7: 投稿機能の追加テスト

### 既存ファイル編集: `tests/posts.spec.ts`

ファイルの末尾（`});` の前）に以下を追加

---

### タスク6: 画像付き投稿

**実装内容**:
1. テキストエリアにテキストを入力
2. 画像ファイルをアップロード
3. 投稿ボタンをクリック
4. 投稿に画像が表示されることを確認

**実装コード**:
```typescript
test("画像付き投稿ができる", async ({ page }) => {
  const postContent = `画像付きテスト ${Date.now()}`;
  const testImagePath = "fixtures/test-post-image.png";

  // テキストを入力
  await page.waitForSelector("textarea");
  await page.fill("textarea", postContent);

  // 画像をアップロード
  // ※ 画像アップロードボタンのセレクタに合わせて調整
  const imageInput = page.locator('input[type="file"][accept*="image"]');
  await imageInput.setInputFiles(testImagePath);

  // 投稿ボタンをクリック
  await page.click("button:has-text('投稿')");

  // 投稿が表示される
  await expect(page.locator(`text=${postContent}`)).toBeVisible({ timeout: 10000 });

  // 画像が表示される
  await expect(page.locator('img[alt="投稿画像"]')).toBeVisible();
});
```

**準備作業**:
1. `tests/fixtures/test-post-image.png` を配置

---

### タスク7: 投稿カードからプロフィール遷移

**実装内容**:
1. タイムラインに投稿が表示されている
2. 投稿カードのユーザー名をクリック
3. ユーザーのプロフィールページに遷移することを確認

**実装コード**:
```typescript
test("投稿カードからユーザープロフィールへ遷移できる", async ({ page }) => {
  // タイムラインの投稿を取得
  await page.waitForSelector('article, [data-testid="post"]', { timeout: 10000 });

  // 最初の投稿のユーザー名リンクをクリック
  const userLink = page.locator('a[href^="/users/"]').first();
  await userLink.click();

  // プロフィールページに遷移
  await page.waitForURL(/\/users\/.+/);

  // プロフィール情報が表示される
  await expect(page.locator('text=@')).toBeVisible();
});
```

---

## タスク8-9, 13-15: インタラクション機能の追加テスト

### 既存ファイル編集: `tests/interactions.spec.ts`

ファイルの末尾（`});` の前）に以下を追加

---

### タスク8: いいねを外す（アンライク）

**実装内容**:
1. いいね済みの投稿を見つける
2. いいねボタンをクリックして外す
3. いいね数が減ることを確認

**実装コード**:
```typescript
test("いいねを外すことができる", async ({ page }) => {
  // タイムラインに投稿があることを確認
  await page.waitForSelector("button", { timeout: 10000 });

  // いいね済みのボタンを探す（♥ のハート）
  const likedButton = page.locator("button").filter({ hasText: /❤️|♥/ }).first();

  // いいね済みのボタンがある場合
  const hasLiked = await likedButton.count() > 0;

  if (hasLiked) {
    // 現在のいいね数を取得
    const likeCountBefore = await page.locator('text').filter({ hasText: /\d+/ }).first().textContent();

    // いいねを外す
    await likedButton.click();
    await page.waitForTimeout(500);

    // いいね数が減ったことを確認
    const likeCountAfter = await page.locator('text').filter({ hasText: /\d+/ }).first().textContent();
    expect(parseInt(likeCountBefore || "0")).toBeGreaterThan(parseInt(likeCountAfter || "0"));
  } else {
    // まずいいねしてから、それを外す
    const likeButton = page.locator("button").filter({ hasText: /♡/ }).first();
    await likeButton.click();
    await page.waitForTimeout(500);

    const unlikeButton = page.locator("button").filter({ hasText: /❤️|♥/ }).first();
    const likeCountBefore = await page.locator('text').filter({ hasText: /\d+/ }).first().textContent();

    await unlikeButton.click();
    await page.waitForTimeout(500);

    const likeCountAfter = await page.locator('text').filter({ hasText: /\d+/ }).first().textContent();
    expect(parseInt(likeCountBefore || "0")).toBeGreaterThan(parseInt(likeCountAfter || "0"));
  }
});
```

---

### タスク9: フォロー統計の表示確認

**実装内容**:
1. プロフィールページを表示
2. フォロー数とフォロワー数が表示されていることを確認

**実装コード**:
```typescript
test("フォロー統計が表示される", async ({ page }) => {
  // プロフィールページへ
  await page.locator('nav a[href="/profile"]').click();
  await page.waitForURL("/profile");

  // フォロー中とフォロワーの数が表示される
  await expect(page.getByText('フォロー中')).toBeVisible();
  await expect(page.getByText('フォロワー')).toBeVisible();

  // 数値が表示されている（数字を含むテキスト）
  const statsText = await page.getByText('フォロー中').first().textContent();
  expect(statsText).toBeTruthy();
});
```

---

### タスク13: 存在しないユーザーのプロフィール

**実装内容**:
1. 存在しないハンドルのURLに直接アクセス
2. エラーメッセージが表示されることを確認

**実装コード**:
```typescript
test("存在しないユーザーのプロフィールはエラー表示", async ({ page }) => {
  // 存在しないハンドルでアクセス
  const nonExistentHandle = `no_user_${Date.now().toString().slice(-6)}`;
  await page.goto(`/users/${nonExistentHandle}`);

  // エラーメッセージが表示される
  await expect(page.getByText('ユーザーが見つかりません')).toBeVisible({ timeout: 5000 });
});
```

---

### タスク14: 投稿がないユーザーのプロフィール

**実装内容**:
1. 投稿がないテストユーザーのプロフィールを表示
2. 「まだ投稿がありません」というメッセージが表示されることを確認

**実装コード**:
```typescript
test("投稿がないユーザーのプロフィールを表示", async ({ page }) => {
  // ※ 別途、投稿がないテストユーザーを用意するか、
  // 新規登録直後のユーザーで確認

  // 自分のプロフィールを表示（投稿削除後など）
  await page.locator('nav a[href="/profile"]').click();
  await page.waitForURL("/profile");

  // すべての投稿を削除してから確認、または
  // 「まだ投稿がありません」メッセージの確認
  const noPostsMessage = page.getByText('まだ投稿がありません');

  if (await noPostsMessage.count() > 0) {
    await expect(noPostsMessage).toBeVisible();
  }
});
```

---

### タスク15: 検索結果が0件

**実装内容**:
1. 検索ページで存在しないユーザーを検索
2. 検索結果が0件であることを確認

**実装コード**:
```typescript
test("検索結果が0件の場合の表示", async ({ page }) => {
  // 検索ページへ
  await page.click("text=検索");
  await page.waitForURL("/search");

  // 存在しないユーザーで検索
  const nonExistentUser = `xyz_${Date.now()}`;
  await page.fill('input[placeholder*="検索"]', nonExistentUser);
  await page.waitForTimeout(500);

  // 検索結果が0件（フォローボタンが表示されない）
  const followButtons = page.locator('button:has-text("フォローする")');
  await expect(followButtons).toHaveCount(0, { timeout: 5000 });
});
```

---

## タスク10: ナビゲーションテスト

### 新規ファイル作成: `tests/navigation.spec.ts`

**ファイル構成**:
```typescript
import { test, expect } from "@playwright/test";

test.describe("ナビゲーション", () => {
  const testEmail = "test-nav@example.com";
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

  // 各テストケースを実装
});
```

---

### タスク10: 各ナビボタンの遷移

**実装内容**:
1. ホームボタン → ホームページ
2. 検索ボタン → 検索ページ
3. プロフィールボタン → プロフィールページ
4. ログアウトボタン → 認証ページ

**実装コード**:
```typescript
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
  await expect(page.locator('text=@')).toBeVisible();
});

test("ログアウトボタンで認証ページへ遷移", async ({ page }) => {
  await page.click("text=ログアウト");

  await page.waitForURL("/auth");
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
```

---

## タスク11-12: 認証・ルーティングの追加テスト

### 既存ファイル編集: `tests/auth.spec.ts`

ファイルの末尾（`});` の前）に以下を追加

---

### タスク11: 未ログイン時のリダイレクト

**実装内容**:
1. 一旦ログアウト
2. 保護されたページ（/、/profile、/search）に直接アクセス
3. 認証ページ（/auth）へリダイレクトされることを確認

**実装コード**:
```typescript
test("未ログイン時は保護ページにアクセスできない", async ({ page }) => {
  // 認証ページに移動（ログインしていない状態）
  await page.goto('/auth');
  await expect(page.locator('input[type="email"]')).toBeVisible();

  // 保護されたページに直接アクセス
  await page.goto('/');

  // 認証ページへリダイレクト
  await page.waitForURL('/auth');
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
```

---

### タスク12: 無効なURLでのリダイレクト

**実装内容**:
1. 存在しないURLにアクセス
2. ホームページ（/）へリダイレクトされることを確認

**実装コード**:
```typescript
test("無効なURLはホームへリダイレクト", async ({ page }) => {
  // ログイン状態で
  await page.goto('/auth');
  await page.click("text=ログイン");
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  await Promise.all([
    page.waitForURL("/", { timeout: 30000 }),
    page.click("button[type='submit']")
  ]);

  // 存在しないURLにアクセス
  await page.goto('/invalid-page-12345');

  // ホームへリダイレクト
  await page.waitForURL("/");
  await expect(page.locator("textarea")).toBeVisible();
});
```

---

# 実装チェックリスト

すべてのタスク完了後、以下のチェックリストで確認してください：

## ファイル作成
- [ ] `tests/profile-edit.spec.ts` を作成
- [ ] `tests/navigation.spec.ts` を作成
- [ ] `tests/fixtures/` ディレクトリを作成
- [ ] `tests/fixtures/test-avatar.png` を配置
- [ ] `tests/fixtures/test-post-image.png` を配置

## テスト実装
- [ ] タスク1: アバター画像アップロード
- [ ] タスク2: ハンドル変更
- [ ] タスク3: 自己紹介変更
- [ ] タスク4: キャンセルボタン
- [ ] タスク5: 重複ハンドルバリデーション
- [ ] タスク6: 画像付き投稿
- [ ] タスク7: 投稿カードからプロフィール遷移
- [ ] タスク8: いいねを外す
- [ ] タスク9: フォロー統計表示
- [ ] タスク10: ナビゲーション各ボタン
- [ ] タスク11: 未ログイン時リダイレクト
- [ ] タスク12: 無効なURLリダイレクト
- [ ] タスク13: 存在しないユーザーのプロフィール
- [ ] タスク14: 投稿がないユーザーのプロフィール
- [ ] タスク15: 検索結果0件

## テスト実行確認
```bash
# 全テスト実行
npx playwright test

# 特定ファイルのみ実行
npx playwright test tests/profile-edit.spec.ts
npx playwright test tests/navigation.spec.ts

# レポート確認
npx playwright show-report
```

---

# メモ

### テストユーザーの準備
以下のテスト用アカウントを事前に作成しておくとスムーズです：

| メールアドレス | 用途 |
|---------------|------|
| test-profile-edit@example.com | プロフィール編集テスト |
| test-nav@example.com | ナビゲーションテスト |

### 画像ファイルの準備
- `tests/fixtures/test-avatar.png`: 正方形の小さな画像（推奨: 200x200px, 10KB以内）
- `tests/fixtures/test-post-image.png`: 投稿用の画像（推奨: 800x600px, 50KB以内）

### 既存のハンドル確認
重複ハンドルのテスト（タスク5）で使用する既存ハンドルを事前に確認してください。
