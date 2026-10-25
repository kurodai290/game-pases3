# NEON SURVIVOR ONLINE — Firebase版

HTML/CSS/JavaScriptだけで動く、最大6人向けのオンラインサバイバルゲーム試作です。ファイルはフォルダーに入れず、すべてルートに置いてあります。

## 最初に必要なFirebase設定

このプロジェクトのFirebase設定は、提供された `game-pases2` の値を `firebase-config.js` に入力済みです。ただし、提供された設定にはRealtime Databaseの `databaseURL` がありません。URLは地域や作成方法によって異なるため、推測して埋めていません。

1. https://console.firebase.google.com/ を開き、`game-pases2` を選択。
2. **構築（Build）→ Realtime Database** を開き、データベースを作成。
3. データベース画面に表示されるURL（`https://...firebasedatabase.app` または `https://...firebaseio.com`）をコピー。
4. `firebase-config.js` の `databaseURL: "PASTE_YOUR_REALTIME_DATABASE_URL_HERE"` を、そのURLに置き換えて保存。
5. Firebase Consoleの **Authentication → Sign-in method** で **匿名（Anonymous）** を有効化。
6. Realtime Databaseの「ルール」画面に `database.rules.json` の内容を設定して公開。

**重要：** 同梱のルールは動作確認用です。ログイン済みの全ユーザーが部屋データを書き換えられるため、本番公開用としては安全ではありません。公開範囲を限定する場合は、参加者・ホスト・ゲーム状態ごとにルールを強化してください。FirebaseのAPIキーは通常フロントエンドに含めますが、データベースルールの代わりにはなりません。

## GitHub Pagesで公開

1. ZIPを展開。
2. `index.html`、`style.css`、`game.js`、`firebase-config.js`、`database.rules.json`、`README.md` を同じ階層のままGitHubリポジトリのルートへアップロード。
3. GitHubリポジトリの **Settings → Pages** で `Deploy from a branch`、ブランチ `main`、フォルダー `/(root)` を選び保存。
4. 公開されたHTTPSのURLを開く。ローカルで `file://` から直接開かず、GitHub PagesなどのHTTPS上でテストしてください。

## 操作

- 部屋を作成すると6文字のコードが発行されます。
- 友達は同じコードを入力して参加します。
- ホストは2〜6人がそろうとゲームを開始できます。
- PC：WASDまたは矢印キーで移動。
- スマートフォン：画面下部の方向ボタンで移動。

## 現状の注意

- これはブラウザだけで動かすための初期版です。ゲーム同期はFirebase Realtime Databaseを使います。
- 敵の状態やプレイヤー状態の同期は簡易方式であり、厳密な競技ゲーム向けの不正対策・サーバー権威型判定は未実装です。
- 本番公開前に複数端末でテストし、Realtime Databaseのセキュリティルールを見直してください。
