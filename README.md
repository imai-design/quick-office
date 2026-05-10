# Quick Office — オフィス用品ECサイト プロトタイプ

「**オフィスに、すぐ届く**」をテーマにした法人向けオフィス用品EC のデモサイト。
**Claude入門1日キャンプ** の教材として、参加者がClaude Coworkに対し
「**この在庫CSVを見て、足りない商品を発注して、領収書をDLして**」と頼む体験を作るために設計されています。

---

## 教材の山場(おすすめ進行)

1. 講師が `sample-inventory.csv` を Cowork に渡す
2. 「足りない商品を Quick Office で発注して、領収書も落として」と頼む
3. Cowork が **発注点割れの商品を抽出 → 1URLで一括カート投入 → checkout 自動入力 → 注文確定 → 領収書PDFを `~/Downloads/` に着地** までを一気に実演
4. Finder の Downloads に `QO-2026XXXX-0001_receipt.pdf` がポンと現れる瞬間が **山場**

---

## 動かし方

### オンラインでも、オフラインでも

1. このフォルダの `login.html` を Chrome で開く(file:// で動きます)
2. **任意のメアド・パスワード** でログイン(ダミー認証)
3. 商品を見る → カートに入れる → 注文確認 → 注文確定 → 領収書PDF

> **オフラインOK**: jsPDF / html2canvas は `vendor/` にローカル同梱済み。
> Google Fonts のみ外部依存ですが、未読込でも system font で動作します。

推奨ブラウザ: **Chrome / Edge / Safari**

---

## URL API(Claudeに渡すと便利)

| URL | 動作 |
|---|---|
| `index.html?cat=トナー・インク` | カテゴリ絞り込み |
| `index.html?q=A4コピー` | 商品名/型番で検索 |
| `index.html?lowstock=1` | **発注点割れの商品だけ**を表示 |
| `product.html?sku=QO-PA4-500` | SKUで商品詳細を直接開く |
| `product.html?id=p005` | IDで商品詳細を直接開く |
| `cart.html?add=QO-PEN-B10:5,QO-PA4-500:2` | **1URLで一括カート投入**(SKU:数量, …) |
| `orders.html?download=last` | 直近注文の領収書を**自動DL** |
| `orders.html?download=QO-20260509-0001` | 指定注文の領収書を自動DL |

> Cowork から「この URL を開いて」と頼むだけで Quick Office を操作できます。

---

## ファイル構成

```
quickoffice/
├── login.html              ログイン
├── index.html              商品一覧
├── product.html            商品詳細
├── cart.html               カート
├── checkout.html           注文確認(配送先/部署/希望納期)
├── order-complete.html     注文完了 + 領収書DL
├── orders.html             注文履歴 + 領収書再DL
├── sample-inventory.csv    在庫スプレッドシート(Coworkに渡す入力例)
├── css/style.css
├── js/
│   ├── data.js             商品20点(在庫数値, 発注点, 推奨ロット)
│   ├── storage.js          localStorage 操作
│   ├── auth.js             ログイン
│   ├── cart.js             カート計算
│   ├── receipt.js          領収書PDF生成
│   └── main.js             各ページ描画 + URL API
├── vendor/
│   ├── html2canvas.min.js
│   └── jspdf.umd.min.js
└── README.md
```

---

## Claude/AIエージェント向けセレクタ早見表

すべての主要操作に `data-qo="..."` を統一付与しています。

| アクション | セレクタ |
|---|---|
| ログイン: メアド | `[data-qo="email"]` |
| ログイン: パスワード | `[data-qo="password"]` |
| ログイン送信 | `[data-qo="login-submit"]` |
| 検索 | `[data-qo="search"]` |
| カテゴリ切替 | `[data-qo="category-filter"][data-cat="..."]` |
| 発注点割れ絞り込み | `[data-qo="lowstock-filter"][data-low="1"]` |
| 商品を開く | `[data-qo="open-product"]` |
| カートに入れる | `[data-qo="add-to-cart"][data-sku="..."]` |
| 数量 | `[data-qo="quantity"]` |
| 数量+/− | `[data-qo="quantity-plus"]` / `[data-qo="quantity-minus"]` |
| カートに進む | `[data-qo="goto-cart"]` |
| 注文手続きへ | `[data-qo="goto-checkout"]` |
| 注文確定 | `[data-qo="confirm-order"]` |
| 配送先入力 | `[data-qo="ck-company"]`, `[data-qo="ck-address"]`, etc. |
| 領収書DL | `[data-qo="download-receipt"]` |
| 注文履歴へ | `[data-qo="goto-orders"]` |
| 注文ID | `[data-qo="order-id"]` |
| カート件数バッジ | `[data-qo="cart-count"]` |
| 在庫状態 | `[data-qo="stock-state"][data-state="in|low|out"]` |
| ログアウト | `[data-qo="logout"]` |

---

## 在庫モデル

各商品は次の数値を持ちます:

| フィールド | 意味 |
|---|---|
| `stockQty` | 現在庫数(個 or セット) |
| `reorderPoint` | 発注点。これを下回ったら発注すべき |
| `reorderQty` | 推奨発注ロット |
| `minOrderQty` | 最低発注数(法人EC的に1単位指定) |

トップページで `?lowstock=1` または「発注点割れのみ」フィルタで、`stockQty < reorderPoint` の商品だけを抽出できます。

---

## カテゴリ一覧(8つ)

文具・事務用品 / コピー用紙・OA用紙 / トナー・インク / コーヒー・お茶 / ティッシュ・衛生用品 / ファイル・収納 / デスク周り / ITアクセサリ

---

## データのリセット

ブラウザのDevTools → Console で:

```js
localStorage.clear()
```

実行 → ページ再読込で、すべてのデータ(ログイン・カート・注文履歴・商品在庫)が初期状態に戻ります。

---

## 領収書PDF

- A4縦・PDF出力
- html2canvas でHTMLを画像化 → jsPDF で PDF 化(**日本語フォント埋め込み不要**)
- 含まれる項目: 領収書番号 / 発行日 / 宛名(会社名 御中, 部署, 担当者様) / 領収金額(税込) / 但し書き / 明細表 / 小計・税・合計 / 発行元 / 「領収済」スタンプ
- ファイル名: `QO-YYYYMMDD-NNNN_receipt.pdf` で `~/Downloads/` に保存

---

## デザイン

- メインカラー: **#2563EB(ブルー)** + アクセント **#F97316(オレンジ)**
- フォント: **Inter**(英数)+ **Noto Sans JP**(日本語)
- モバイル対応: 880px以下でレイアウト切り替え
- 商品画像: カテゴリ別SVGプレースホルダ(外部依存なし)

---

## 教材の使い方の例(講師向けスクリプト)

```
講師「会社の在庫スプレッドシートを Cowork に渡してみます」
  → sample-inventory.csv を Cowork にドラッグ&ドロップ

講師「『これを見て、足りない商品を Quick Office で発注して、領収書も落として』」

Cowork が:
  1. CSVを読む → 「在庫薄」「至急」フラグの商品を抽出
  2. cart.html?add=QO-WBM-04:15,QO-PA4-500:30,... を生成して開く
  3. checkout.html でデフォルト値のまま注文確定
  4. orders.html?download=last で領収書を自動DL

参加者「うわ、本当に発注して領収書まで落としてる…!」← 山場
```

楽しんで!
