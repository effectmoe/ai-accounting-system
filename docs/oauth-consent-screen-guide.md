# OAuth同意画面の設定ガイド（分かりやすい版）

## 🎯 このステップの目的

Googleに「このアプリは安全です」と登録する作業です。
自分専用のアプリなので、最小限の設定でOKです。

## 📍 現在地の確認

Google Cloud Console にログインして、以下の場所にいることを確認：
- URL: `https://console.cloud.google.com/apis/credentials/consent`
- または: 左メニュー → APIとサービス → OAuth同意画面

## 🔄 設定の流れ

### ステップ1: User Type（ユーザータイプ）の選択

画面に2つの選択肢が表示されます：

```
○ 内部（Internal）
● 外部（External）← これを選択
```

**外部を選択** → **「作成」ボタン**をクリック

### ステップ2: アプリ情報（必須項目のみ）

#### 必須項目（赤い * マークがついている項目）

| 項目名 | 入力する内容 |
|--------|--------------|
| **アプリ名** | AI会計システム GAS Manager |
| **ユーザーサポートメール** | あなたのGmailアドレス |
| **デベロッパーの連絡先情報** | あなたのGmailアドレス（同じでOK） |

#### スキップして良い項目
- アプリのロゴ
- アプリケーションのホームページ
- アプリケーションのプライバシーポリシー
- アプリケーションの利用規約
- 承認済みドメイン

**「保存して次へ」**をクリック

### ステップ3: スコープ（権限）の設定

#### 3-1. スコープ追加画面を開く
「スコープを追加または削除」ボタンをクリック

#### 3-2. スコープを検索して追加

右側にパネルが開きます。以下を1つずつ検索して追加：

**検索方法：**
1. 検索窓に「script.projects」と入力
2. 結果から該当するものにチェック
3. 次のスコープを検索...

**追加するスコープ一覧：**

| 検索キーワード | 選択するスコープ |
|---------------|-----------------|
| script.projects | https://www.googleapis.com/auth/script.projects |
| script.deployments | https://www.googleapis.com/auth/script.deployments |
| script.processes | https://www.googleapis.com/auth/script.processes |
| drive | https://www.googleapis.com/auth/drive |
| spreadsheets | https://www.googleapis.com/auth/spreadsheets |

#### 3-3. 更新を確定
1. 全てチェックしたら「更新」ボタン
2. 元の画面に戻るので「保存して次へ」

### ステップ4: テストユーザー

#### 4-1. ユーザー追加
1. 「+ ADD USERS」ボタンをクリック
2. あなたのGmailアドレスを入力
3. 「追加」ボタン

#### 4-2. 確認
- リストにあなたのメールアドレスが表示されればOK
- 「保存して次へ」

### ステップ5: 概要（確認画面）

設定内容が表示されます。
「ダッシュボードに戻る」をクリックで完了！

## ✅ 設定完了の確認

OAuth同意画面のステータスが以下のようになっていればOK：
- 公開ステータス: **テスト**
- ユーザーの上限: 100

## 🤔 よくある質問

**Q: 「このアプリは確認されていません」と後で表示される**
A: 正常です。自分で作ったアプリなので、警告を無視して進めてOK

**Q: スコープが見つからない**
A: 検索窓に一部だけ入力してみてください（例：「script」だけ）

**Q: テストユーザーは自分だけ？**
A: はい、自分のGmailアドレスだけでOKです

## 次のステップ

この設定が完了したら、ステップ4の「OAuth 2.0 クライアントIDの作成」に進んでください！