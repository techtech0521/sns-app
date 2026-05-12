# Playwright テスト知見まとめ & 理解度チェックテスト

作成日: 2026-05-11

---

# 知見まとめ

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

## 3. 今回学んだこと

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

## 自己採点基準

| レベル | 問題数 | 目標正解数 | 評価 |
|--------|--------|-----------|------|
| レベル1（基礎） | 3問 | 3問 | Playwrightテストの基礎理解 |
| レベル2（応用） | 3問 | 2問以上 | 実践的なテスト記述能力 |
| レベル3（実践） | 2問 | 1問以上 | トラブルシューティング能力 |

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
| `Element not attached to DOM` | 要素が画面から消えた | 再度要素を取得する |
| `Target closed` | ページが閉じた、またはナビゲートした | 適切な待機処理を入れる |
