# SNSアプリケーション - 機能改善ロードマップ

最終更新: 2026-04-08

---

## 🔴 Phase 1: セキュリティ・信頼性（最優先）

| # | 機能 | 優先度 | 複雑さ | ステータス |
|---|------|--------|--------|----------|
| 1 | XSS対策（入力サニタイズ） | Critical | 中 | ☐ 未着手 |
| 2 | メール認証 | Critical | 中 | ☐ 未着手 |
| 3 | パスワードリセット | Critical | 中 | ☐ 未着手 |
| 4 | サーバーサイドレート制限 | Critical | 中 | ☐ 未着手 |
| 5 | コンテンツモデレーション | Critical | 高 | ☐ 未着手 |
| 6 | 2FA（二要素認証） | Critical | 高 | ☐ 未着手 |

### 詳細

#### 1. XSS対策（入力サニタイズ）
- **ファイル**: `src/components/posts/PostCard.tsx`
- **対応**: DOMPurifyを導入して投稿内容をサニタイズ
- **関連**: プロフィール（bio）、コメントにも適用

#### 2. メール認証
- **対応**: Supabase Authのメール確認機能を有効化
- **影響**: 仮登録防止、スパムアカウント削減

#### 3. パスワードリセット
- **対応**: Supabase Authのパスワードリセット機能を実装
- **UI**: パスワード忘れ画面、メール送信、再設定画面

#### 4. サーバーサイドレート制限
- **現状**: `src/utils/rateLimit.ts` がクライアント側のみ（localStorage）
- **対応**: Supabase Edge Functions または RLS ポリシーで実装

#### 5. コンテンツモデレーション
- **機能**: 通報機能、管理者用ダッシュボード、自動フィルター
- **DB**: `reports` テーブル追加

#### 6. 2FA（二要素認証）
- **対応**: Supabase AuthのMFA機能またはTOTP実装
- **UI**: 認証アプリ設定画面、バックアップコード表示

---

## 🟠 Phase 2: コアUX（ユーザー体験の根幹）

| # | 機能 | 優先度 | 複雑さ | ステータス |
|---|------|--------|--------|----------|
| 7 | 画像/動画アップロード | High | 高 | ☐ 未着手 |
| 8 | コメント機能 | High | 中 | ☐ 未着手 |
| 9 | リアルタイム更新 | High | 高 | ☐ 未着手 |
| 10 | 下書き保存 | High | 中 | ☐ 未着手 |
| 11 | ダークモード | High | 低 | ☐ 未着手 |
| 12 | 無限スクロール | High | 中 | ☐ 未着手 |
| 13 | プッシュ通知 | High | 中 | ☐ 未着手 |
| 14 | オフライン対応（PWA） | High | 高 | ☐ 未着手 |

### 詳細

#### 7. 画像/動画アップロード
- **対応**: Supabase Storage にファイル保存
- **UI**: アップロードボタン、プレビュー、プログレスバー
- **DB**: `media` テーブル追加

#### 8. コメント機能
- **UI**: 投稿下部にコメント欄、ネスト表示
- **DB**: `comments` テーブル、`parent_id` でネスト構造

#### 9. リアルタイム更新
- **対応**: Supabase Realtime を活用
- **対象**: 新しい投稿、いいね、フォロー、コメントが自動反映

#### 10. 下書き保存
- **対応**: LocalStorage で自動保存
- **UI**: 「下書きがあります」バナー、復元ボタン

#### 11. ダークモード
- **対応**: Tailwind の `dark:` クラス、CSS 変数
- **永続化**: ユーザー設定で LocalStorage に保存

#### 12. 無限スクロール
- **対応**: Intersection Observer API
- **対象**: タイムライン、ユーザー投稿一覧

#### 13. プッシュ通知
- **対応**: Web Push API、Service Worker
- **通知**: フォロー、いいね、コメント、リポスト
- **DB**: `notifications` テーブル追加

#### 14. オフライン対応（PWA）
- **対応**: Service Worker、マニフェストファイル
- **機能**: オフラインでの閲覧、キャッシュ戦略

---

## 🟡 Phase 3: エンゲージメント機能

| # | 機能 | 優先度 | 複雑さ | ステータス |
|---|------|--------|--------|----------|
| 15 | リポスト/シェア | Medium | 中 | ☐ 未着手 |
| 16 | ブックマーク/保存 | Medium | 低 | ☐ 未着手 |
| 17 | メンション(@user) & ハッシュタグ | Medium | 中 | ☐ 未着手 |
| 18 | 投稿編集履歴 | Medium | 中 | ☐ 未着手 |
| 19 | 投稿スケジュール | Medium | 中 | ☐ 未着手 |
| 20 | 高度な検索 | Medium | 高 | ☐ 未着手 |
| 21 | トレンド/話題のタグ | Medium | 中 | ☐ 未着手 |
| 22 | ユーザーリスト | Medium | 低 | ☐ 未着手 |
| 23 | ストーリーズ | Medium | 高 | ☐ 未着手 |
| 24 | アンケート/投票 | Medium | 中 | ☐ 未着手 |

### 詳細

#### 15. リポスト/シェア
- **UI**: リポストボタン、リポスト投稿の表示
- **DB**: `posts` テーブルに `repost_of_id` カラム追加

#### 16. ブックマーク/保存
- **UI**: ブックマークボタン、保存した投稿一覧ページ
- **DB**: `bookmarks` テーブル追加

#### 17. メンション(@user) & ハッシュタグ
- **UI**: @入力でユーザー候補表示、#ハッシュタグリンク化
- **DB**: `mentions`, `hashtags`, `post_hashtags` テーブル追加

#### 18. 投稿編集履歴
- **UI**: 「編集済み」表示、履歴モーダル
- **DB**: `post_edits` テーブル追加

#### 19. 投稿スケジュール
- **UI**: 日時選択ピッカー、スケジュール済み投稿一覧
- **DB**: `schedules` テーブル、Edge Functions で定期実行

#### 20. 高度な検索
- **対応**: Supabase Full-Text Search または PostgreSQL 検索
- **対象**: 投稿本文、ユーザー名、ハッシュタグ

#### 21. トレンド/話題のタグ
- **UI**: ホーム画面にトレンドセクション
- **アルゴリズム**: 過去24時間の投稿数で算出

#### 22. ユーザーリスト
- **UI**: リスト作成、メンバー追加、リスト別タイムライン
- **DB**: `user_lists` テーブル追加

#### 23. ストーリーズ
- **UI**: 上部ストーリーズカルーセル、24時間で消費
- **DB**: `stories` テーブル、`expires_at` カラム

#### 24. アンケート/投票
- **UI**: 投稿作成時にアンケート追加、選択肢で投票
- **DB**: `polls`, `poll_options`, `poll_votes` テーブル追加

---

## 🟢 Phase 4: テクニカル改善

| # | 機能 | 優先度 | 複雑さ | ステータス |
|---|------|--------|--------|----------|
| 25 | テストフレームワーク | High | 中 | ☐ 未着手 |
| 26 | エラー監視・ロギング | High | 中 | ☐ 未着手 |
| 27 | パフォーマンス最適化 | Medium | 中 | ☐ 未着手 |
| 28 | アクセシビリティ(a11y) | Medium | 中 | ☐ 未着手 |
| 29 | 国際化(i18n) | Medium | 高 | ☐ 未着手 |

### 詳細

#### 25. テストフレームワーク
- **対応**: Jest + React Testing Library
- **対象**: コンポーネント、ユーティリティ、E2Eテスト

#### 26. エラー監視・ロギング
- **対応**: Sentry 導入
- **機能**: エラー追跡、パフォーマンス監視

#### 27. パフォーマンス最適化
- **対応**: コード分割、遅延読み込み、画像最適化
- **ツール**: Viteの最適化機能

#### 28. アクセシビリティ(a11y)
- **対応**: ARIAラベル、キーボードナビゲーション、スクリーンリーダー対応

#### 29. 国際化(i18n)
- **対応**: react-i18next または similar
- **言語**: 日本語、英語

---

## 🔵 Phase 5: あると嬉しい機能

| # | 機能 | 優先度 | 複雑さ | ステータス |
|---|------|--------|--------|----------|
| 30 | リッチテキストエディタ | Low | 高 | ☐ 未着手 |
| 31 | アナリティクス画面 | Low | 中 | ☐ 未着手 |
| 32 | カスタムテーマ | Low | 中 | ☐ 未着手 |
| 33 | キーボードショートカット | Low | 低 | ☐ 未着手 |
| 34 | 翻訳機能 | Low | 高 | ☐ 未着手 |

---

## 追加が必要なデータベーステーブル

```sql
-- コメント
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メディア（画像/動画）
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- 'image' or 'video'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ブックマーク
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 通知
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'repost'
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ハッシュタグ
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 投稿-ハッシュタグ紐付け
CREATE TABLE post_hashtags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

-- メンション
CREATE TABLE mentions (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, mentioned_user_id)
);

-- 投稿編集履歴
CREATE TABLE post_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- スケジュール投稿
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'posted', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通報
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 投稿テーブル追加カラム
ALTER TABLE posts ADD COLUMN repost_of_id UUID REFERENCES posts(id) ON DELETE CASCADE;
```

---

## 実装推奨スケジュール

### Week 1-2: セキュリティ強固化
- [ ] XSS対策実装
- [ ] メール認証有効化
- [ ] パスワードリセット実装

### Week 3-4: コア機能拡張
- [ ] 画像アップロード
- [ ] コメント機能
- [ ] ダークモード

### Week 5-6: UX向上
- [ ] リアルタイム更新
- [ ] 下書き保存
- [ ] 無限スクロール

### Week 7-8: エンゲージメント
- [ ] リポスト
- [ ] ブックマーク
- [ ] メンション/ハッシュタグ

---

## 優先度判断基準

| 優先度 | 定義 |
|--------|------|
| Critical | セキュリティリスク、または製品のコア機能に欠陥がある |
| High | ユーザー体験に大きく影響する、または競合製品で標準 |
| Medium | あると便利だが、なくても機能する |
| Low | 機能の完全性には影響しない |

---

## 複雑度判断基準

| 複雑さ | 見積もり |
|--------|----------|
| 低 | 1-2日 |
| 中 | 3-5日 |
| 高 | 1週間以上 |

---

*このドキュメントはプロジェクトの進捗に応じて随時更新してください*
