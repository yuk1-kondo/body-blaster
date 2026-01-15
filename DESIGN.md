# 🎮 姿勢シューティングゲーム設計（決定版）

## 仮タイトル
**Body Blaster**
*Your body is the controller.*

---

## ① ゲーム全体像（MVP）

### 画面構成
```
┌───────────────────┐
│   敵    敵    敵   │
│                   │
│        ● ← 自機   │
│                   │
│ HP: ♥♥♥   SCORE  │
└───────────────────┘
```

- 上から敵が出現
- プレイヤーは画面下
- 弾幕シューティングではなく**回避重視**（姿勢入力向け）

---

## ② 操作設計（超重要）

### 🎮 操作マッピング（確定案）

| プレイヤー動作 | 判定ロジック | ゲーム操作 |
|--------------|------------|----------|
| 体を左へ移動 | 腰 or 肩のX座標 | 左移動 |
| 体を右へ移動 | 同上 | 右移動 |
| 両手を前に出す | 手首Z差 or 肩-手距離 | 通常ショット |
| 両手を大きく広げる | 両手間距離 > 閾値 | ボム |
| しゃがむ | 腰Y座標 ↓ | 回避モード |

👉 **大きく・分かりやすい動作のみ採用**（誤検出＝ストレスなので）

---

## ③ MediaPipe Pose 使用ポイント

### 使用する主要ランドマーク
- `LEFT_SHOULDER`
- `RIGHT_SHOULDER`
- `LEFT_WRIST`
- `RIGHT_WRIST`
- `LEFT_HIP`
- `RIGHT_HIP`

### 例：左右移動の計算
```javascript
const centerX = (pose.LEFT_HIP.x + pose.RIGHT_HIP.x) / 2;
player.x = map(centerX, 0.3, 0.7, 0, screenWidth);
```

※ **カメラ距離に依存しないよう正規化必須**

---

## ④ 発射判定ロジック（安定版）

### ✔ 通常ショット
```javascript
const handForward = (leftWrist.z + rightWrist.z) / 2;

if (handForward < FIRE_THRESHOLD) {
  shoot();
}
```

### ✔ ボム（誤爆しにくい）
```javascript
const handDistance = distance(leftWrist, rightWrist);

if (handDistance > BOMB_THRESHOLD) {
  activateBomb();
}
```

👉 **Z軸＋距離判定は誤検出が最小**

---

## ⑤ ゲームループ構成

```
camera frame
   ↓
MediaPipe Pose 推定
   ↓
姿勢 → 入力変換
   ↓
ゲームロジック更新
   ↓
描画（Canvas / Three.js）
```

---

## ⑥ 技術スタック（最小構成）

### フロントエンド
- MediaPipe Pose（CDN）
- Canvas 2D（最初は Three.js 不要）
- requestAnimationFrame

### なぜ Canvas？
- 軽い
- デバッグしやすい
- 姿勢入力との相性◎

---

## ⑦ ノイズ対策（超重要）

### 平滑化（必須）
```javascript
smoothX = lerp(prevX, currentX, 0.2);
```

### デッドゾーン
```javascript
if (Math.abs(dx) < 0.03) return;
```

---

## ⑧ 最初に作る MVP チェックリスト

### Day 1
- [x] カメラ映像表示
- [x] MediaPipe Pose 動作確認
- [x] 骨格デバッグ表示

### Day 2
- [x] 左右移動だけ実装
- [x] 自機を動かす

### Day 3
- [x] 発射判定
- [x] 敵1種類

### Day 4
- [x] スコア・HP
- [ ] 効果音

---

## ⑨ 拡張アイデア（あとで）

- [ ] 片手ショット（右手＝強、左手＝連射）
- [ ] ジャンプで無敵時間
- [ ] プレイヤーの動きが激しいほど攻撃力UP（運動量ゲージ）
- [ ] マルチプレイ（左右分割）

---

## デプロイ環境

姿勢シューティング（Webカメラ使用）だと、デプロイ環境は **「静的ホスティング + HTTPS」** が最適です。

### 結論：おすすめ順

1. **Cloudflare Pages（おすすめ）**
   - 静的サイトに最強、速い、無料枠が強い
   - GitHub 連携して main に push したら自動デプロイ
   - カスタムドメイン/HTTPS もワンクリック

2. **Vercel**
   - React / Vite / Next.js と相性抜群
   - 自動デプロイが超ラク
   - ほぼ「GitHub → Import → Done」

3. **Netlify**
   - これも静的サイト向け定番
   - フォームとかも使いたいなら便利

4. **GitHub Pages（最小構成）**
   - いちばん手軽（無料）
   - ただしビルド手順（Vite/React）やルーティングが少し癖ある
   - ※「本番にする」というより「公開デモ置き場」向き

### カメラ系でハマりやすい注意点（重要）

- 必ず **HTTPS**（本番）
- iOS Safari は制約多め：
  - `playsinline`、`muted`、オートプレイ制限などでハマりがち
- デバッグ用に「骨格表示ON/OFF」トグルを作ると便利

### 最短デプロイ手順（Vite想定）

1. GitHub に push
2. Cloudflare Pages / Vercel で Import
3. Build 設定
   - Build command: `npm run build`
   - Output dir: `dist`
4. 完了（自動でHTTPS付く）

---

## 実装ステータス

### ✅ 完了
- MediaPipe Pose 統合
- リアルタイム姿勢検出
- プレイヤー移動（平滑化・デッドゾーン適用）
- 発射システム（両手前出し）
- ボムシステム（両手広げ）
- 敵の生成と移動
- 当たり判定
- スコア・HP管理
- ゲームオーバー処理
- カメラプレビュー + 骨格表示
- アクション説明UI

### 🔄 進行中
- GitHub リポジトリセットアップ

### 📋 今後の予定
- 効果音・BGM
- しゃがみ回避モード
- より多様な敵パターン
- パワーアップアイテム
- ランキング機能

---

**Enjoy playing Body Blaster!** 💪🎮
