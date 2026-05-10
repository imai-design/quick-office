/* ===== カート/合計計算 共通ユーティリティ ===== */
const QOCart = {
  TAX_RATE: 0.10,

  // カートのアイテム配列に商品情報を結合して返す
  resolveCart() {
    const cart = QOStorage.getCart();
    return cart
      .map((item) => {
        const product = QOStorage.getProductById(item.productId);
        if (!product) return null;
        return {
          ...item,
          product,
          subtotal: product.price * item.quantity,
        };
      })
      .filter(Boolean);
  },

  // 税抜小計
  calcSubtotal(items) {
    return items.reduce((sum, i) => sum + i.subtotal, 0);
  },

  calcTax(subtotal) {
    return Math.floor(subtotal * this.TAX_RATE);
  },

  calcTotal(subtotal) {
    return subtotal + this.calcTax(subtotal);
  },

  // 数値を ¥1,234 形式に
  formatYen(n) {
    return '¥' + n.toLocaleString('ja-JP');
  },
};
