/* ===== Quick Office デモ商品データ =====
 * 在庫は数値で持つ(教材で「発注点割れ」を判定するため)。
 * 画像は外部依存しないようカテゴリ別SVGプレースホルダを data URI で埋め込み。
 */

const QO_CATEGORIES = [
  '文具・事務用品',
  'コピー用紙・OA用紙',
  'トナー・インク',
  'コーヒー・お茶',
  'ティッシュ・衛生用品',
  'ファイル・収納',
  'デスク周り',
  'ITアクセサリ',
];

/* SVGプレースホルダ生成。カテゴリごとにアイコンと色を変える */
function _qoSvg(label, icon, bgColor, fgColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgColor}"/>
        <stop offset="100%" stop-color="${fgColor}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <text x="200" y="160" text-anchor="middle" font-size="100" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${icon}</text>
    <text x="200" y="230" text-anchor="middle" font-size="20" font-weight="600" fill="white" font-family="-apple-system, BlinkMacSystemFont, sans-serif" opacity="0.92">${label}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const QO_CATEGORY_VISUALS = {
  '文具・事務用品':       { icon: '✏️', bg: '#3B82F6', fg: '#1E40AF' },
  'コピー用紙・OA用紙':   { icon: '📄', bg: '#06B6D4', fg: '#0E7490' },
  'トナー・インク':       { icon: '🖨️', bg: '#8B5CF6', fg: '#5B21B6' },
  'コーヒー・お茶':       { icon: '☕', bg: '#D97706', fg: '#92400E' },
  'ティッシュ・衛生用品': { icon: '🧻', bg: '#10B981', fg: '#065F46' },
  'ファイル・収納':       { icon: '🗂️', bg: '#F59E0B', fg: '#B45309' },
  'デスク周り':           { icon: '🖱️', bg: '#64748B', fg: '#334155' },
  'ITアクセサリ':         { icon: '🔌', bg: '#EC4899', fg: '#9D174D' },
};

function _imgFor(category, productLabel) {
  const v = QO_CATEGORY_VISUALS[category] || { icon: '📦', bg: '#94A3B8', fg: '#475569' };
  return _qoSvg(productLabel, v.icon, v.bg, v.fg);
}

/* 商品データ
 * - stockQty: 現在庫数(個 or セット)
 * - reorderPoint: これを下回ったら発注すべき水準(発注点)
 * - reorderQty: 推奨発注ロット
 * - minOrderQty: 最低発注数(法人EC的)
 */
const QO_DEMO_PRODUCTS = [
  // 文具・事務用品
  { id: 'p001', sku: 'QO-PEN-B10', name: 'ボールペン 黒 10本セット',         category: '文具・事務用品',       price: 380,   unit: '1セット(10本)',
    stockQty: 48, reorderPoint: 20, reorderQty: 30, minOrderQty: 1,
    description: '法人向け定番のなめらか書き味ボールペン。0.7mm 黒インク。10本入りお得セット。耐久性のある軸で長期間使用可能。' },

  { id: 'p002', sku: 'QO-HL-05C', name: '蛍光ペン 5色セット',                category: '文具・事務用品',       price: 450,   unit: '1セット(5本)',
    stockQty: 32, reorderPoint: 10, reorderQty: 20, minOrderQty: 1,
    description: '視認性の高いパステル系5色セット。重要箇所のマーキングに最適。にじみにくいインク使用。' },

  { id: 'p003', sku: 'QO-SN-75P5', name: '付箋 75x75 5冊パック',             category: '文具・事務用品',       price: 290,   unit: '1パック(5冊×100枚)',
    stockQty: 8,  reorderPoint: 15, reorderQty: 30, minOrderQty: 1,
    description: '貼ってはがせる定番サイズの付箋。1冊100枚×5冊のお得パック。会議メモやToDo整理に。' },

  { id: 'p004', sku: 'QO-WBM-04', name: 'ホワイトボードマーカー 4色セット',  category: '文具・事務用品',       price: 590,   unit: '1セット(4色)',
    stockQty: 4,  reorderPoint: 10, reorderQty: 15, minOrderQty: 1,
    description: '黒・赤・青・緑の4色セット。中字丸芯。にじみが少なく、消し残りもしにくい高耐久タイプ。' },

  // コピー用紙・OA用紙
  { id: 'p005', sku: 'QO-PA4-500', name: 'A4コピー用紙 500枚',                category: 'コピー用紙・OA用紙',   price: 580,   unit: '1冊(500枚)',
    stockQty: 12, reorderPoint: 20, reorderQty: 30, minOrderQty: 1,
    description: '高白色度のA4コピー用紙500枚入り。普通紙コピー機・レーザープリンタ・インクジェットプリンタすべてに対応。' },

  { id: 'p006', sku: 'QO-PA3-500', name: 'A3コピー用紙 500枚',                category: 'コピー用紙・OA用紙',   price: 1280,  unit: '1冊(500枚)',
    stockQty: 18, reorderPoint: 8,  reorderQty: 15, minOrderQty: 1,
    description: '大判資料・図面用のA3コピー用紙。500枚入り。両面印刷対応の高品質ペーパー。' },

  // トナー・インク
  { id: 'p007', sku: 'QO-INK-LC411', name: 'ブラザー LC411 互換インク 4色',   category: 'トナー・インク',       price: 2980,  unit: '1セット(4色)',
    stockQty: 6,  reorderPoint: 5,  reorderQty: 10, minOrderQty: 1,
    description: 'ブラザー LC411対応の互換インクカートリッジ4色セット。純正比1/3のコストで高品質印刷。' },

  { id: 'p008', sku: 'QO-TNR-CN-K', name: 'Canon 互換トナー 黒(LBP/iR用)',   category: 'トナー・インク',       price: 8800,  unit: '1本',
    stockQty: 1,  reorderPoint: 4,  reorderQty: 6,  minOrderQty: 1,
    description: 'Canon LBP/iR対応 大容量トナー(約3,000枚印刷)。シャープな黒文字を再現。' },

  // コーヒー・お茶
  { id: 'p009', sku: 'QO-CF-NGB80', name: 'ネスカフェ ゴールドブレンド 80g', category: 'コーヒー・お茶',       price: 980,   unit: '1瓶(80g)',
    stockQty: 14, reorderPoint: 12, reorderQty: 20, minOrderQty: 1,
    description: 'オフィスの定番。インスタントコーヒー80g瓶。約40杯分。すっきりとした味わい。' },

  { id: 'p010', sku: 'QO-CUP-200', name: '紙コップ 200ml 100個入',           category: 'コーヒー・お茶',       price: 380,   unit: '1パック(100個)',
    stockQty: 2,  reorderPoint: 8,  reorderQty: 12, minOrderQty: 1,
    description: '使い捨て紙コップ200ml。ホット・コールド両用。エンボス加工で持ちやすい。' },

  { id: 'p011', sku: 'QO-TB-IGO50', name: '伊藤園 おーいお茶 ティーバッグ 50袋', category: 'コーヒー・お茶',   price: 680,   unit: '1箱(50袋)',
    stockQty: 9,  reorderPoint: 6,  reorderQty: 12, minOrderQty: 1,
    description: '一番茶を100%使用した煎茶ティーバッグ。ホット・水出し両対応。' },

  // ティッシュ・衛生用品
  { id: 'p012', sku: 'QO-TS-5P', name: 'ティッシュペーパー 5箱パック',       category: 'ティッシュ・衛生用品', price: 480,   unit: '1パック(5箱)',
    stockQty: 25, reorderPoint: 10, reorderQty: 20, minOrderQty: 1,
    description: '柔らかい肌触りのティッシュ150組×5箱。オフィスや会議室の常備品に。' },

  { id: 'p013', sku: 'QO-AW-100', name: 'アルコール除菌ウェットティッシュ 100枚', category: 'ティッシュ・衛生用品', price: 580, unit: '1パック(100枚)',
    stockQty: 3,  reorderPoint: 8,  reorderQty: 12, minOrderQty: 1,
    description: 'アルコール70%配合のウェットティッシュ。デスクや備品の除菌に。100枚入り。' },

  // ファイル・収納
  { id: 'p014', sku: 'QO-CL-100', name: 'A4クリアファイル 100枚',            category: 'ファイル・収納',       price: 580,   unit: '1パック(100枚)',
    stockQty: 22, reorderPoint: 15, reorderQty: 25, minOrderQty: 1,
    description: 'A4対応クリアホルダー100枚パック。透明度が高く資料の視認性が良好。書類整理の必需品。' },

  { id: 'p015', sku: 'QO-FL-A410', name: '2穴ファイル A4 10冊セット',         category: 'ファイル・収納',       price: 1280,  unit: '1セット(10冊)',
    stockQty: 7,  reorderPoint: 5,  reorderQty: 10, minOrderQty: 1,
    description: 'A4タテ2穴ファイル10冊セット。背幅50mm。長期保管・契約書管理に。' },

  // デスク周り
  { id: 'p016', sku: 'QO-MP-BK', name: 'マウスパッド ブラック',              category: 'デスク周り',           price: 680,   unit: '1枚',
    stockQty: 16, reorderPoint: 8,  reorderQty: 12, minOrderQty: 1,
    description: '滑り止め加工付きマウスパッド。サイズ250×210mm。光学式・レーザー式マウス対応。' },

  { id: 'p017', sku: 'QO-PS-MT', name: '卓上ペン立て メタル',                category: 'デスク周り',           price: 890,   unit: '1個',
    stockQty: 5,  reorderPoint: 6,  reorderQty: 10, minOrderQty: 1,
    description: 'シンプルなメタル素材のペンスタンド。ペン・ハサミ・定規などをまとめて収納。安定感のある重量設計。' },

  // ITアクセサリ
  { id: 'p018', sku: 'QO-USB-C1', name: 'USB-Cケーブル 1m',                  category: 'ITアクセサリ',         price: 980,   unit: '1本',
    stockQty: 11, reorderPoint: 10, reorderQty: 15, minOrderQty: 1,
    description: 'USB-C to USB-C 1mケーブル。PD充電(最大60W)・データ転送対応。スマホ・ノートPC共用。' },

  { id: 'p019', sku: 'QO-WM-01', name: 'ワイヤレスマウス',                   category: 'ITアクセサリ',         price: 1480,  unit: '1個',
    stockQty: 13, reorderPoint: 5,  reorderQty: 10, minOrderQty: 1,
    description: '2.4GHz無線接続のワイヤレスマウス。USBレシーバー付属。静音クリック設計。単3電池1本で動作。' },

  { id: 'p020', sku: 'QO-HDMI-2M', name: 'HDMIケーブル 2m',                   category: 'ITアクセサリ',         price: 880,   unit: '1本',
    stockQty: 2,  reorderPoint: 6,  reorderQty: 10, minOrderQty: 1,
    description: '4K/60Hz対応 HDMIケーブル2m。会議室のディスプレイ接続・プロジェクタ接続に。' },
].map((p) => ({ ...p, image: _imgFor(p.category, p.sku) }));

/* 在庫ヘルパ: 発注点を下回っているか */
function qoIsLowStock(p) { return p.stockQty < p.reorderPoint; }
function qoIsOutOfStock(p) { return p.stockQty <= 0; }
function qoStockState(p) {
  if (qoIsOutOfStock(p)) return 'out';
  if (qoIsLowStock(p))   return 'low';
  return 'in';
}
