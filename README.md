# 🎮 Body Blaster

**Your body is the controller.**

MediaPipe Poseを使った姿勢シューティングゲーム。あなたの体の動きでゲームをプレイしましょう！

## 🎯 特徴

- 🎥 **カメラで体を認識** - MediaPipe Poseによるリアルタイム姿勢検出
- 🎮 **直感的な操作** - 体を動かすだけで遊べる
- 💪 **運動になる** - ゲームをプレイしながら楽しく体を動かせる
- 🌐 **ブラウザで動作** - インストール不要、ブラウザだけで完結
- 🆓 **完全無料** - サーバー不要、静的ホスティングで動作

## 🕹️ 操作方法

| 動作 | ゲーム操作 |
|------|-----------|
| 🔄 体を左右に動かす | プレイヤーの左右移動 |
| 👐 両手を前に出す | 弾を発射 |
| 🤸 両手を大きく広げる | ボム発動（全画面攻撃） |

## 🚀 ローカルでの起動方法

### 1. HTTPサーバーを起動

カメラを使用するため、HTTPSまたはlocalhostでの実行が必要です。

**Python 3がインストールされている場合:**

```bash
cd body-blaster
python3 -m http.server 8000
```

**Node.jsがインストールされている場合:**

```bash
# http-serverをグローバルインストール（初回のみ）
npm install -g http-server

# サーバー起動
cd body-blaster
http-server -p 8000
```

**VS Codeを使用している場合:**

Live Server拡張機能をインストールして、index.htmlを右クリック → "Open with Live Server"

### 2. ブラウザでアクセス

```
http://localhost:8000
```

カメラへのアクセス許可を求められたら「許可」を選択してください。

## 📦 ファイル構成

```
body-blaster/
├── index.html          # メインHTML
├── style.css           # スタイルシート
├── js/
│   ├── game.js         # ゲームループとメイン制御
│   ├── pose.js         # MediaPipe Pose処理
│   ├── player.js       # プレイヤー制御
│   ├── enemy.js        # 敵管理
│   ├── bullet.js       # 弾丸管理
│   └── utils.js        # ユーティリティ関数
└── README.md
```

## 🌐 デプロイ方法

### Cloudflare Pages（推奨）

1. GitHubリポジトリを作成してコードをプッシュ
2. [Cloudflare Pages](https://pages.cloudflare.com/)にアクセス
3. GitHubアカウントで連携
4. リポジトリを選択
5. ビルド設定は不要（静的サイト）
6. デプロイ完了！自動的にHTTPSが付与されます

### GitHub Pages

1. GitHubリポジトリを作成
2. Settings → Pages
3. Source: main branch / root
4. Save
5. 数分後にデプロイ完了

### Vercel

1. [Vercel](https://vercel.com/)でGitHubアカウント連携
2. Import Project
3. リポジトリを選択
4. デプロイ完了！

## 🎮 ゲームのコツ

- カメラから **1.5〜2m離れた位置** でプレイすると認識精度が向上します
- 明るい場所でプレイしてください
- 両手をしっかり前に出すと弾が発射されます
- ボムはクールダウンがあるので、ピンチの時に使いましょう
- 「骨格表示」ボタンをONにすると、姿勢認識の様子が確認できます

## 🛠️ 技術スタック

- **MediaPipe Pose** - 姿勢検出
- **Canvas 2D** - ゲーム描画
- **Vanilla JavaScript** - フレームワーク不要
- **HTML5** - カメラアクセス

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエスト、Issue、改善提案を歓迎します！

## 🎯 今後の拡張予定

- [ ] しゃがみ動作による回避モード
- [ ] 複数種類の敵パターン
- [ ] パワーアップアイテム
- [ ] ランキング機能（Firebaseなど）
- [ ] マルチプレイモード
- [ ] 効果音・BGM

---

Enjoy playing Body Blaster! 💪🎮
