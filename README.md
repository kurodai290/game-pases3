# NEON ARCADE 2.0 — Firebase Online

3つのミニゲームを先行実装した、GitHub Pages向けのフラット構成です。フォルダー分けは不要です。

## ファイル一覧
- `index.html` — メニュー、オンラインロビー、ゲーム画面
- `style.css` — レスポンシブなネオンUI
- `game.js` — ゲーム処理とFirebase通信
- `firebase-config.js` — Firebase設定（既存の game-pases2 プロジェクト）
- `database.rules.json` — 動作確認用ルールの参考

## 公開手順
1. ZIPを展開し、5ファイルをGitHubリポジトリ `game-pases3` のルートへアップロードします。既存ファイルは置き換えてください。
2. Firebase Console の `game-pases2` で Authentication → Sign-in method → Anonymous を有効にします。
3. Realtime Database が作成済みで、`firebase-config.js` の `databaseURL` が実際のURLと一致することを確認します。
4. Realtime Database の Rules を確認し、必要なルールを設定して公開します。
5. GitHub Pagesで公開し、`Ctrl + F5` で再読み込みします。

## ゲーム
- タイピング綱引き：英単語を入力してルームのロープ位置を動かす対戦
- カラー・ドミネーション：共有グリッドのマスを塗り、45秒で陣地を競う
- グリッド・スナイパー：光ったターゲットをタップし、20秒のスコアを競う

オンラインルームは最大6人です。ルーム内のプレイヤー名と各ゲームのベストスコアがリアルタイムで共有されます。

## データベースルールについて
`database.rules.json` は認証済みユーザーに部屋データの読み書きを許可する**開発・動作確認用の緩い設定例**です。これをそのまま一般公開すると、他人が部屋やスコアを改ざんできる可能性があります。一般公開前には、部屋メンバーの検証やスコア更新の制限など、より厳格なルールを設計してください。

## 注意
- Firebaseの匿名認証を有効にしてください。
- ブラウザでES ModulesとFirebase CDNを読み込むため、`file://` ではなくGitHub PagesなどHTTP(S)で開いてください。
- 実装は構文チェック済みですが、複数端末での実際のオンライン対戦テストは未実施です。
