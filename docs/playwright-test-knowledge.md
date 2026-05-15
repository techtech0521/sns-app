# Playwright テスト知見まとめ & 理解度チェックテスト

作成日: 2026-05-11

---

# 知見まとめ

## 更新履歴
- **2026-05-11** 初版作成（CSSセレクタ、TimeoutError）
- **2026-05-15** Strict Mode Violation、Promise/await、認証・ルーティングテストを追加

---

## 1. CSSセレクタの基本構文

### 属性セレクタ

| パターン | 構文 | 意味 | 例 |
|---------|------|------|---|
| 完全一致 | `[attr="value"]` | 属性値が完全に一致 | `a[href="/profile"]` |
| 前方一致 | `[attr^="value"]` | 属性値が...で始まる | `a[href^="/users/"]` |
| 後方一致 | `[attr$="value"]` | 属性値が...で終わる | `a[href$="/edit"]` |
| 部分一致 | `[attr*="value"]` | 属性値が...を含む | `input[class*="form"]` |
| 単語一致 | `[attr~="value"]` | 属性値が...を単語として含む | `p[class~="active"]` |

**よくある間違い:**
```typescript
// ❌ 間違い（属性値を引用符で囲んでいない）
'a[href=^="/users/"]'

// ✅ 正しい
'a[href^="/users/"]'
```

### 複数セレクタの組み合わせ

CSSではカンマ区切りで「OR」条件を指定できます：
```css
article, [data-testid="post"]
```
これは「article要素 または data-testid="post"を持つ要素」を意味します。

---

## 2. Playwright のセレクタ

### 推奨されるセレクタの優先順位

1. **ロールベース（最も推奨）**
   ```typescript
   page.getByRole('button', { name: '投稿' })
   ```

2. **ラベルベース**
   ```typescript
   page.getByText('投稿する')
   page.getByLabelText('メールアドレス')
   ```

3. **テストID（実装時に追加が必要）**
   ```typescript
   page.getByTestId('post-card')
   ```

4. **CSSセレクタ（DOM構造に依存しやすい）**
   ```typescript
   page.locator('a[href^="/users/"]')
   ```

### セレクタのベストプラクティス

| ❌ 避けるべき | ✅ 推奨される |
|--------------|--------------|
| `div:nth-child(3) > button` | `getByRole('button', { name: '保存' })` |
| `.btn-primary.large` | `getByRole('button', { name: /保存/i })` |
| `#submit-btn-12345` | `getByTestId('submit-button')` |

---

## 3. 今回学んだこと（第1回：2026-05-11）

### 問題: TimeoutError
```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
```

### 原因
テストコードのセレクタと実際のDOM構造が不一致だった。

**テストコード:**
```typescript
await page.waitForSelector('article, [data-testid="post"]', { timeout: 10000 });
```

**実際のDOM（PostCard.tsx）:**
```tsx
<div className="bg-white border border-gray-200 rounded-lg p-4...">
  {/* articleタグではなくdivタグ */}
  {/* data-testid属性もない */}
</div>
```

### 解決策
**オプション1:** 実際に存在する要素を待つ
```typescript
await page.waitForSelector('a[href^="/users/"]', { timeout: 10000 });
```

**オプション2:** 目的のアクションを実行してから待つ
```typescript
const userLink = page.locator('a[href^="/users/"]').first();
await userLink.waitFor({ timeout: 10000 });
await userLink.click();
```

**オプション3:** テストIDを追加して使う（将来的な改善）
```tsx
<div data-testid="post-card" className="bg-white...">
```
```typescript
await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
```

---

## 3.2. Strict Mode Violation（第2回：2026-05-15）

### 問題
```
Error: strict mode violation: locator('text=@') resolved to 2 elements
```

### 原因
Playwrightはデフォルトで、セレクタが**1つの要素に一致**することを期待します。セレクタが複数の要素に一致すると、strict mode violation エラーが発生します。

**テストコード（navigation.spec.ts）:**
```typescript
await expect(page.locator('text=@')).toBeVisible();
```

**エラーの原因:**
```html
<!-- 2つの要素に '@' が含まれている -->
<a href="/profile">@user_ff72deda</a>  <!-- ナビゲーションバー -->
<p>@user_ff72deda</p>                  <!-- プロフィールページ本文 -->
```

### 解決策
**オプション1:** `.first()` で最初の要素のみを使用
```typescript
await expect(page.locator('text=@').first()).toBeVisible();
```

**オプション2:** より具体的なセレクタを使う
```typescript
// ナビゲーションバーのリンクを確認
await expect(page.locator('nav a[href="/profile"]')).toBeVisible();

// または特定のコンテキスト内
await expect(page.locator('.profile-header').getByText('@')).toBeVisible();
```

**オプション3:** `has()` で親要素を指定
```typescript
await expect(page.locator('nav', { hasText: '@' })).toBeVisible();
```

### Strict Mode Violation が発生しやすいセレクタ

| セレクタ | 問題 | 改善案 |
|---------|------|--------|
| `page.locator('text=保存')` | 「保存」ボタンが複数ある | `.first()` またはより具体的なロール |
| `page.getByText('フォロー')` | フォローボタンが複数ある | `.first()` または親要素で指定 |
| `page.locator('button')` | ボタンが多数ある | 具体的なテキストやロールを指定 |

---

## 3.3. Promiseとawait（第2回：2026-05-15）

### 問題
```
プロパティ 'match' は型 'Promise<string \| null>' に存在しません
```

### 原因
Playwrightの多くのメソッド（`textContent()`、`innerHTML()`、`getValue()` など）は**Promiseを返します**。`await` を忘れると、Promiseオブジェクトに対して操作しようとしてエラーになります。

**間違ったコード:**
```typescript
const text = page.locator('button').textContent();  // Promise<string | null>
const num = text.match(/\d+/);  // ❌ エラー: Promiseにmatchはない
```

### 解決策
**必ず `await` を使う:**
```typescript
const text = await page.locator('button').textContent();  // string | null
const num = text?.match(/\d+/)?.[0];  // ✅ 正しい
```

### Promiseを返す主なメソッド

| メソッド | 戻り値（Promiseでラップ） | 使用例 |
|---------|--------------------------|--------|
| `.textContent()` | `Promise<string \| null>` | `await elem.textContent()` |
| `.innerHTML()` | `Promise<string \| null>` | `await elem.innerHTML()` |
| `.inputValue()` | `Promise<string>` | `await input.inputValue()` |
| `.getAttribute()` | `Promise<string \| null>` | `await elem.getAttribute('href')` |
| `.count()` | `Promise<number>` | `await elems.count()` |
| `.isVisible()` | `Promise<boolean>` | `await elem.isVisible()` |

### 実践例: いいね数を取得する

**間違った実装:**
```typescript
const countText = page.locator('button').textContent();
const count = parseInt(countText.match(/\d+/)[0]);  // ❌ エラー
```

**正しい実装:**
```typescript
const countText = await page.locator('button').textContent();
const count = parseInt(countText?.match(/\d+/)?.[0] || "0");  // ✅ 正しい
```

**オプショナルチェイニング(`?.`)の活用:**
```typescript
// textContent() が null を返す可能性があるため
const text = await elem.textContent();
const match = text?.match(/\d+/)?.[0];  // 安全にアクセス
const num = match ? parseInt(match) : 0;
```

---

## 4. DOM構造の確認方法

### 方法1: 実際のコンポーネントコードを読む
```bash
# 投稿カードの実装を確認
cat src/components/posts/PostCard.tsx
```

### 方法2: ブラウザの開発者ツール
1. アプリケーションを開く
2. F12 で開発者ツールを開く
3. 要素を選択してHTML構造を確認

### 方法3: Playwright Inspector
```bash
npx playwright test --debug
```

---

# 理解度チェックテスト

## レベル1: 基礎

### Q1. 以下のセレクタの問題を指摘してください
```typescript
'a[href=^="/users/"]'
```

<details>
<summary>回答</summary>

**問題:** `^=` の前に引用符がない
```typescript
'a[href^="/users/"]'  // 正しい
```

`^=` は属性セレクタの演算子であり、引用符で囲まれた属性値の前に配置する必要があります。
</details>

---

### Q2. 以下のセレクタが何を選択するか説明してください
```typescript
'a[href^="/users/"]'
```

<details>
<summary>回答</summary>

`href` 属性の値が `/users/` で**始まる**すべての `<a>` 要素を選択します。

例: 一致する要素
- `<a href="/users/john">`
- `<a href="/users/jane/edit">`
- `<a href="/users/123">`

例: 一致しない要素
- `<a href="/profile">`
- `<a href="/search">`
- `<a href="https://example.com/users/john">`
</details>

---

### Q3. TimeoutError が出たとき、まず確認すべきことは何ですか？

<details>
<summary>回答</summary>

1. **セレクタが正しいか** - 構文ミスがないか
2. **DOM構造と一致しているか** - 実際のHTML要素が存在するか
3. **タイミングの問題か** - 要素が表示されるまで時間がかかっているか
4. **タイムアウト時間** - デフォルトの時間で足りているか

確認方法:
```bash
npx playwright test --debug  # Inspectorで確認
```
</details>

---

## レベル2: 応用

### Q4. 以下の2つのセレクタの違いを説明してください
```typescript
// A
'a[href="/profile"]'

// B
'a[href^="/profile"]'
```

<details>
<summary>回答</summary>

**A:** `href` 属性が **完全に** `/profile` と一致する要素のみ選択
- 一致: `<a href="/profile">`
- 不一致: `<a href="/profile/edit">`

**B:** `href` 属性が `/profile` で**始まる**要素すべてを選択
- 一致: `<a href="/profile">`, `<a href="/profile/edit">`
- 不一致: `<a href="/my-profile">`
</details>

---

### Q5. 次のDOM構造に対して、投稿カードを待つ適切なセレクタを選んでください

```html
<div class="bg-white border border-gray-200 rounded-lg p-4">
  <a href="/users/john">@john</a>
  <p>Hello world</p>
</div>
```

選択肢:
1. `await page.waitForSelector('article')`
2. `await page.waitForSelector('div.bg-white')`
3. `await page.waitForSelector('a[href^="/users/"]')`

<details>
<summary>回答</summary>

**3. `await page.waitForSelector('a[href^="/users/"]')` が最適**

理由:
- 選択肢1: `<article>` タグは存在しない（`<div>` しかない）
- 選択肢2: `div.bg-white` は動く可能性が高いが、他の要素でも同じクラスを使っている可能性がある
- 選択肢3: `a[href^="/users/"]` は投稿カード内に確実に存在し、目的のアクション（クリック）にも直結している

**第2候補として2も使える:**
```typescript
await page.waitForSelector('div.bg-white.border')
```
クラスを複数組み合わせることで、より具体的な要素を特定できる。
</details>

---

### Q6. 以下のテストが失敗する原因を特定してください

```typescript
// PostCard.tsx
<div className="bg-white p-4">
  <Link to={`/users/${handle}`}>{username}</Link>
</div>
```

```typescript
// テスト
await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
```

<details>
<summary>回答</summary>

**原因:** `PostCard.tsx` に `data-testid="post-card"` 属性が追加されていない

**解決策:**

1. コンポーネントに属性を追加:
```tsx
<div data-testid="post-card" className="bg-white p-4">
```

2. または、実際に存在する要素を選択:
```typescript
await page.waitForSelector('a[href^="/users/"]', { timeout: 10000 });
// または
await page.waitForSelector('div.bg-white.p-4', { timeout: 10000 });
```
</details>

---

## レベル3: 実践

### Q7. 次のシナリオでテストコードを完成させてください

**シナリオ:**
- 検索結果ページで「フォロー中」ボタンをクリックしてフォローを解除したい
- 「フォロー中」ボタンは最初に見つかったものを使う

**穴埋め問題:**
```typescript
// 「フォロー中」ボタンを探す
const followingButton = page.locator('______________').first();

await followingButton.__________({ timeout: 10000 });

await followingButton.__________();

// 「フォローする」ボタンに戻ったことを確認
await expect(page.locator('______________')).toBeVisible();
```

<details>
<summary>回答</summary>

```typescript
// 「フォロー中」ボタンを探す
const followingButton = page.locator('button:has-text("フォロー中")').first();

await followingButton.waitFor({ timeout: 10000 });

await followingButton.click();

// 「フォローする」ボタンに戻ったことを確認
await expect(page.locator('button:has-text("フォローする")')).toBeVisible();
```
</details>

---

### Q8. テストが不安定な場合のデバッグ手順を説明してください

**状況:** テストが「成功するとき」と「失敗するとき」がある

<details>
<summary>回答</summary>

**デバッグ手順:**

1. **Playwright Inspectorで実行**
   ```bash
   npx playwright test --debug
   ```
   実行を止めて要素を確認できる

2. **スクリーンショットを撮る**
   ```typescript
   await page.screenshot({ path: 'debug.png' });
   ```

3. **明示的に待つ**
   ```typescript
   await page.waitForSelector('target-element', { timeout: 10000 });
   ```

4. **ステップ実行**
   ```bash
   npx playwright test --headed
   ```

5. **ネットワーク待ちを考慮**
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

6. **再試行ロジックを追加（最終手段）**
   ```typescript
   await expect(async () => {
     await page.reload();
     await expect(page.locator('element')).toBeVisible();
   }).toPass({ retries: 3 });
   ```
</details>

---

### Q9. 以下のエラーの原因と解決策を説明してください

```typescript
await expect(page.locator('text=保存')).toBeVisible();

// エラー:
// strict mode violation: locator('text=保存') resolved to 3 elements
```

<details>
<summary>回答</summary>

**原因:** `text=保存` というセレクタがページ上の3つの要素に一致している

**解決策:**

1. `.first()` で最初の要素のみを使用:
```typescript
await expect(page.locator('text=保存').first()).toBeVisible();
```

2. より具体的なセレクタ:
```typescript
await expect(page.getByRole('button', { name: '保存' }).first()).toBeVisible();
// または
await expect(page.locator('.modal').getByText('保存')).toBeVisible();
```

3. 親要素で絞り込む:
```typescript
await expect(page.locator('.edit-form', { hasText: '保存' })).toBeVisible();
```
</details>

---

### Q10. 以下のコードのエラーを修正してください

```typescript
const buttonText = page.locator('button').textContent();
const number = parseInt(buttonText.match(/\d+/)[0]);
```

<details>
<summary>回答</summary>

**問題:** `textContent()` は Promise を返すので `await` が必要

**修正後:**
```typescript
const buttonText = await page.locator('button').textContent();
const number = parseInt(buttonText?.match(/\d+/)?.[0] || "0");
```

**ポイント:**
- `await` を忘れずに付ける
- `textContent()` は `null` を返す可能性があるので `?.` を使う
- マッチしない場合のデフォルト値を用意する
</details>

---

### Q11. 認証・ルーティングテストで、「未ログイン時に保護ページへアクセスしたらリダイレクトされる」ことを確認するテストを完成させてください

**穴埋め問題:**
```typescript
test("未ログイン時は保護ページにアクセスできない", async ({ page }) => {
    // 認証ページに移動（ログインしていない状態）
    await page.goto("/auth");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // 保護されたページに直接アクセス
    await page.goto("_____");

    // 認証ページへリダイレクト
    await page.__________("/auth");
    await expect(page.locator('input[type="email"]'))._______();
});
```

<details>
<summary>回答</summary>

```typescript
test("未ログイン時は保護ページにアクセスできない", async ({ page }) => {
    // 認証ページに移動（ログインしていない状態）
    await page.goto("/auth");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // 保護されたページに直接アクセス
    await page.goto("/");

    // 認証ページへリダイレクト
    await page.waitForURL("/auth");
    await expect(page.locator('input[type="email"]')).toBeVisible();
});
```

**ポイント:**
- 保護されたルート（`/`、`/profile`、`/search` など）に直接アクセス
- 認証ページへリダイレクトされることを `waitForURL()` で確認
- ログインフォームが表示されることを確認
</details>

---

## 自己採点基準（更新）

| レベル | 問題数 | 目標正解数 | 評価 |
|--------|--------|-----------|------|
| レベル1（基礎） | 3問 | 3問 | Playwrightテストの基礎理解 |
| レベル2（応用） | 3問 | 2問以上 | 実践的なテスト記述能力 |
| レベル3（実践） | 5問 | 3問以上 | トラブルシューティング能力、認証・ルーティング理解 |

---

# 付録：よく使うセレクタ一覧

| 目的 | Playwright セレクタ |
|------|-------------------|
| テキストを含む要素 | `page.getByText('保存')` |
| ロールで指定 | `page.getByRole('button', { name: '保存' })` |
| プレースホルダーで入力 | `page.getByPlaceholder('メールアドレス')` |
| ラベルで入力 | `page.getByLabel('ユーザー名')` |
| alt属性で画像 | `page.getByAltText('プロフィール画像')` |
| タイトルで要素 | `page.getByTitle('ツールチップ')` |
| testid属性 | `page.getByTestId('submit-btn')` |
| CSSセレクタ | `page.locator('a[href^="/users/"]')` |
| 複数の最初 | `.first()` |
| 複数の最後 | `.last()` |
| n番目 | `.nth(2)` |

---

# 付録：エラーメッセージ集

| エラー | 原因 | 解決策 |
|--------|------|--------|
| `TimeoutError: waitForSelector` | セレクタが間違っている、または要素が表示されていない | セレクタを確認、DOM構造を確認、待ち時間を延長 |
| `strict mode violation` | セレクタが複数の要素に一致 | `.first()` を付けるか、より具体的なセレクタを使う |
| `プロパティ 'match' は型 'Promise<...>' に存在しません` | `await` を忘れている | `await page.locator(...).textContent()` のように `await` を付ける |
| `Element not attached to DOM` | 要素が画面から消えた | 再度要素を取得する |
| `Target closed` | ページが閉じた、またはナビゲートした | 適切な待機処理を入れる |

---

# 付録：今回実装したテスト一覧（第2回：2026-05-15）

## 認証・ルーティングテスト (`auth.spec.ts`)

| テスト名 | 内容 | 学んだこと |
|---------|------|-----------|
| 未ログイン時は保護ページにアクセスできない | 未ログイン状態で `/` にアクセス → `/auth` にリダイレクト | 認証チェックのテスト方法 |
| 無効なURLはホームへリダイレクト | 存在しないURLにアクセス → `/` にリダイレクト | エラーハンドリングのテスト方法 |

## インタラクションテスト (`interactions.spec.ts`)

| テスト名 | 内容 | 学んだこと |
|---------|------|-----------|
| いいねを外すことができる | いいね済みの投稿でクリック → いいね解除 | 条件分岐、テキストから数字の抽出 |
| フォロー統計が表示される | プロフィールページで「フォロー中」「フォロワー」が表示 | 統計情報の確認方法 |
| 存在しないユーザーのプロフィールはエラー表示 | 存在しないハンドルでアクセス → エラーメッセージ | エッジケースのテスト方法 |
| 投稿がないユーザーのプロフィールを表示 | 投稿がない状態でのプロフィール表示 | 条件分岐による対応 |
| 検索結果が0件の場合の表示 | 存在しないユーザーで検索 → 結果0件 | `toHaveCount(0)` の使用方法 |

## ナビゲーションテスト (`navigation.spec.ts` 新規作成)

| テスト名 | 内容 | 学んだこと |
|---------|------|-----------|
| ホームボタンでホームページへ遷移 | 別ページからホームボタンで遷移 | ナビゲーション遷移のテスト |
| 検索ボタンで検索ページへ遷移 | 検索ボタンで検索ページへ | 基本的な遷移テスト |
| プロフィールボタンでプロフィールページへ遷移 | プロフィールボタンで遷移 | **strict mode violation の対応** |
| ログアウトボタンで認証ページへ遷移 | ログアウトで認証ページへ | ログアウト機能のテスト |

---

# 付録：テスト実装のコツ

## 1. 条件分岐のテスト

テスト内で条件によって処理を分ける場合：

```typescript
// いいね済みの投稿があるか確認
const hasLiked = await likedButton.count() > 0;

if (hasLiked) {
    // いいね解除の処理
} else {
    // まずいいねしてから解除する処理
}
```

## 2. テキストから数値を抽出する

ボタン内のカウント値などを取得：

```typescript
const text = await button.textContent();
// "❤️ 5" や "♡ 3" などの文字列から数字を抽出
const count = parseInt(text?.match(/\d+/)?.[0] || "0");
```

## 3. 0件確認のテスト

要素が存在しないことを確認：

```typescript
// 方法1: toHaveCount(0)
await expect(page.locator('button:has-text("フォローする")')).toHaveCount(0);

// 方法2: not.toBeVisible()
await expect(page.locator('text=結果なし')).not.toBeVisible();
```

## 4. リダイレクト確認のテスト

```typescript
// 直接アクセス
await page.goto("/protected-page");

// リダイレクト先を確認
await page.waitForURL("/auth");
await expect(page).toHaveURL("/auth");
```


