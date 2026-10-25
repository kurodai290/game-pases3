# NEON ARCADE — レイアウト修正版

## ファイル
すべてのファイルは同じ階層に置いてください。フォルダーに分ける必要はありません。

- `index.html` — 画面構成
- `style.css` — レイアウト修正版（デスクトップは3列、タブレットは2列、スマホは1列）
- `game.js` — ゲームとFirebase通信
- `firebase-config.js` — Firebaseプロジェクト設定
- `database.rules.json` — ルール設定の参考

## GitHubへの反映
1. ZIPを展開します。
2. 上記ファイルをリポジトリのルートにアップロードし、同名ファイルを置き換えます。
3. Commit changes で保存します。
4. GitHub Pagesを開き、`Ctrl + F5` で強制再読み込みします。

`index.html` のCSS参照にはキャッシュ回避用のバージョン番号を付けています。

## 注意
Firebaseのルールはゲームのデータ保護に関わります。`database.rules.json` はそのまま公開用の安全性を保証するものではありません。公開前に、参加者が他人のスコアやゲーム状態を不正に変更できないようルールを確認してください。
