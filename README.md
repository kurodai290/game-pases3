# NEON ARCADE — ミニゲームコレクション

フォルダーを増やさず、ファイルをすべて同じ階層に置く構成です。GitHub Pagesで公開できます。

## ゲーム
- 反射神経テスト：ランダムな合図に反応
- ネオン回避：左右に動いて障害物を避ける
- 10秒連打王：10秒間のタップ数を競う
- 記憶パネル：光った順番を覚える
- ターゲットハント：ターゲットを15回狙う

## GitHub Pagesへの設置
1. ZIPを展開します。
2. `index.html`、`style.css`、`game.js`、`firebase-config.js`、`database.rules.json`、`README.md` をGitHubリポジトリのルートへアップロードします。
3. Settings → Pages で `main` ブランチと `/(root)` を選択します。

## Firebase
`firebase-config.js` は指定された `game-pases2` の設定を使用しています。
Firebase Consoleで以下を有効にしてください。
- Authentication → Sign-in method → Anonymous
- Realtime Databaseを作成し、`databaseURL` が `https://game-pases2-default-rtdb.firebaseio.com/` と一致することを確認
- `database.rules.json` のルールをRealtime DatabaseのRulesタブに設定してPublish

## オンラインルーム
オンラインルームは6人まで。部屋コードを共有すると同じルームに参加でき、各自のミニゲームのスコアがランキングに反映されます。ゲームそのものは各端末で進行し、スコアのみ共有します。

## 注意
これは遊び用の試作です。公開環境でのスコアやルームデータは不正操作を完全には防げません。公開ランキングなど本格運用をする場合は、Firebase Security Rulesをより厳密にし、スコア計算を信頼できるサーバー側に移してください。
