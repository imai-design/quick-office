/* ===== Quick Office localStorage 操作 ===== */
const STORAGE_KEYS = {
  PRODUCTS: 'qo_products',
  CART: 'qo_cart',
  ORDERS: 'qo_orders',
  USER: 'qo_user',
  ORDER_SEQ: 'qo_order_seq',
  CHECKOUT: 'qo_checkout',
};

const QOStorage = {
  // ---- Products ----
  initProducts() {
    // データスキーマが変わったら再投入できるように、stockQtyの有無で判定
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0].stockQty === 'number') {
          return; // 最新スキーマ
        }
      } catch (_) {}
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(QO_DEMO_PRODUCTS));
  },
  getProducts() {
    this.initProducts();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  },
  getProductById(id) {
    return this.getProducts().find((p) => p.id === id);
  },
  getProductBySku(sku) {
    if (!sku) return null;
    const norm = String(sku).toUpperCase();
    return this.getProducts().find((p) => p.sku.toUpperCase() === norm);
  },
  // id でも sku でも取れる
  resolveProduct(idOrSku) {
    if (!idOrSku) return null;
    return this.getProductById(idOrSku) || this.getProductBySku(idOrSku);
  },

  // ---- Cart ----
  getCart() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');
  },
  setCart(cart) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  },
  clearCart() {
    localStorage.removeItem(STORAGE_KEYS.CART);
  },
  addToCart(productId, quantity = 1) {
    const cart = this.getCart();
    const existing = cart.find((c) => c.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ productId, quantity });
    }
    this.setCart(cart);
    return cart;
  },
  updateCartQuantity(productId, quantity) {
    const cart = this.getCart();
    const item = cart.find((c) => c.productId === productId);
    if (!item) return cart;
    if (quantity <= 0) {
      const next = cart.filter((c) => c.productId !== productId);
      this.setCart(next);
      return next;
    }
    item.quantity = quantity;
    this.setCart(cart);
    return cart;
  },
  removeFromCart(productId) {
    const cart = this.getCart().filter((c) => c.productId !== productId);
    this.setCart(cart);
    return cart;
  },
  getCartTotalCount() {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
  },

  // URL一括追加: "QO-PEN-B10:5,QO-PA4-500:2" or "p001:3"
  // 戻り値: { added: [{sku,name,quantity}], notFound: ["..."] }
  addToCartFromQuery(spec) {
    const result = { added: [], notFound: [] };
    if (!spec) return result;
    const parts = String(spec).split(',').map((s) => s.trim()).filter(Boolean);
    parts.forEach((part) => {
      const [key, qStr] = part.split(':').map((s) => (s || '').trim());
      const qty = Math.max(1, parseInt(qStr || '1', 10) || 1);
      const product = this.resolveProduct(key);
      if (!product) { result.notFound.push(key); return; }
      this.addToCart(product.id, qty);
      result.added.push({ id: product.id, sku: product.sku, name: product.name, quantity: qty });
    });
    return result;
  },

  // ---- Checkout情報(配送先など) ----
  getCheckoutDefaults() {
    const raw = localStorage.getItem(STORAGE_KEYS.CHECKOUT);
    if (raw) try { return JSON.parse(raw); } catch (_) {}
    const user = this.getUser();
    return {
      company: user ? `${user.displayName} のオフィス` : '株式会社サンプル',
      department: '総務部',
      contactName: user?.displayName || 'ご担当者',
      address: '〒100-0001 東京都千代田区千代田1-1-1 サンプルビル5F',
      phone: '03-0000-0000',
      deptCode: 'D-001',
      desiredDate: '最短',
      note: '',
    };
  },
  saveCheckout(data) {
    localStorage.setItem(STORAGE_KEYS.CHECKOUT, JSON.stringify(data));
  },

  // ---- Orders ----
  getOrders() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  },
  getOrderById(id) {
    return this.getOrders().find((o) => o.id === id);
  },
  getLatestOrder() {
    return this.getOrders()[0] || null;
  },
  addOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },
  generateOrderNumber() {
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const seq = parseInt(localStorage.getItem(STORAGE_KEYS.ORDER_SEQ) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEYS.ORDER_SEQ, String(seq));
    return `QO-${ymd}-${String(seq).padStart(4, '0')}`;
  },

  // 注文後、商品在庫を減算(教材として「発注したら在庫が回復する」を演出)
  consumeStockOnOrder(orderItems) {
    const products = this.getProducts();
    orderItems.forEach((it) => {
      const p = products.find((x) => x.id === it.productId);
      if (p) p.stockQty = Math.max(0, (p.stockQty || 0) + it.quantity);
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  // ---- User ----
  getUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
  clearUser() {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },
};
