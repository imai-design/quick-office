/* ===== Quick Office 共通UI =====
 * セレクタ規約(Claude/AIエージェント向け):
 *   data-qo="add-to-cart"      商品をカートに追加
 *   data-qo="open-product"     商品詳細を開く
 *   data-qo="quantity"         数量入力
 *   data-qo="quantity-plus"    数量+ボタン
 *   data-qo="quantity-minus"   数量-ボタン
 *   data-qo="goto-checkout"    カート→注文確認画面
 *   data-qo="confirm-order"    注文確定
 *   data-qo="download-receipt" 領収書PDF DL
 *   data-qo="logout"           ログアウト
 *   data-qo="search"           検索input
 *   data-qo="category-filter"  カテゴリ切替
 *   data-qo="lowstock-filter"  発注点割れ絞り込み
 *   data-qo="email"            ログイン: メアド
 *   data-qo="password"         ログイン: パスワード
 *   data-qo="login-submit"     ログイン送信
 */

const QOUI = {
  renderHeader({ showSearch = true, currentSearch = '' } = {}) {
    const user = QOStorage.getUser();
    const cartCount = QOStorage.getCartTotalCount();
    const slot = document.getElementById('header-slot');
    if (!slot) return;

    slot.innerHTML = `
      <header class="header">
        <a href="index.html" class="logo" data-qo="home">
          <span class="logo-mark" aria-hidden="true">Q</span>Quick Office
          <span class="logo-tag">オフィスに、すぐ届く</span>
        </a>
        ${showSearch ? `
          <div class="search">
            <input type="search" id="header-search" data-qo="search" aria-label="商品検索"
              placeholder="商品名・型番で検索…" value="${escapeHtml(currentSearch)}" />
          </div>` : '<div style="flex:1"></div>'}
        <div class="header-actions">
          <a href="settings.html" class="btn btn-ghost" data-qo="goto-settings" aria-label="発行元情報">
            <span aria-hidden="true">🏢</span> 発行元情報${!QOStorage.isIssuerConfigured() ? '<span class="badge-dot" title="未設定" aria-label="未設定"></span>' : ''}
          </a>
          <a href="orders.html" class="btn btn-ghost" data-qo="goto-orders" aria-label="注文履歴">
            <span aria-hidden="true">📋</span> 注文履歴
          </a>
          <a href="cart.html" class="cart-btn" data-qo="goto-cart" aria-label="カート">
            <span aria-hidden="true">🛒</span> カート
            <span class="cart-count" data-qo="cart-count">${cartCount}</span>
          </a>
          ${user ? `<span class="user-name" data-qo="user-name">${escapeHtml(user.displayName)} 様</span>` : ''}
          <button type="button" id="logout-btn" data-qo="logout" class="btn btn-outline">ログアウト</button>
        </div>
      </header>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', () => QOAuth.logout());

    // 検索: トップページならイベント発火、それ以外なら index.html?q= に遷移
    const search = document.getElementById('header-search');
    if (search) {
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = search.value.trim();
          // index.html かどうかは product-grid 要素の有無で判定(file:// 対応)
          const isIndex = !!document.getElementById('product-grid');
          if (isIndex) {
            window.dispatchEvent(new CustomEvent('qo-search', { detail: { q } }));
          } else {
            window.location.href = 'index.html?q=' + encodeURIComponent(q);
          }
        }
      });
    }
  },

  toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1800);
  },
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function safeIntFrom(value, fallback = 1, { min = 1, max = 999 } = {}) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function stockBadge(p) {
  const state = qoStockState(p);
  const qty = p.stockQty;
  if (state === 'out') {
    return `<span class="stock-badge stock-out" data-qo="stock-state" data-state="out">在庫切れ</span>`;
  }
  if (state === 'low') {
    return `<span class="stock-badge stock-low" data-qo="stock-state" data-state="low">発注点割れ (在庫${qty}/発注点${p.reorderPoint})</span>`;
  }
  return `<span class="stock-badge stock-in" data-qo="stock-state" data-state="in">在庫${qty}個</span>`;
}

function shortStockBadge(p) {
  const state = qoStockState(p);
  if (state === 'out') return `<span class="stock-badge stock-out">在庫切れ</span>`;
  if (state === 'low') return `<span class="stock-badge stock-low">残${p.stockQty}個</span>`;
  return `<span class="stock-badge stock-in">在庫${p.stockQty}個</span>`;
}

/* ===== トップページ ===== */
function initIndexPage() {
  if (!QOAuth.requireLogin()) return;

  // URLパラメータ
  const params = new URLSearchParams(window.location.search);
  let activeCategory = params.get('cat') || 'all';
  let searchQuery = params.get('q') || '';
  let lowStockOnly = params.get('lowstock') === '1';

  QOUI.renderHeader({ showSearch: true, currentSearch: searchQuery });

  const products = QOStorage.getProducts();
  const sidebar = document.getElementById('cat-list');
  const grid = document.getElementById('product-grid');
  const filterBar = document.getElementById('filter-bar');

  // サイドバーカテゴリ
  const cats = [{ key: 'all', label: 'すべての商品' }].concat(
    QO_CATEGORIES.map((c) => ({ key: c, label: c }))
  );
  function renderSidebar() {
    sidebar.innerHTML = cats.map((c) => {
      const count = products.filter((p) => c.key === 'all' ? true : p.category === c.key).length;
      return `<li><button type="button" data-qo="category-filter" data-cat="${escapeHtml(c.key)}" class="${c.key === activeCategory ? 'active' : ''}">
        ${escapeHtml(c.label)} <span style="float:right;color:var(--color-text-muted);font-weight:500;font-size:11px;">${count}</span>
      </button></li>`;
    }).join('');
  }
  renderSidebar();

  sidebar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    renderSidebar();
    syncUrl();
    render();
  });

  // 発注点割れフィルタ
  function renderFilterBar() {
    const lowCount = products.filter((p) => qoIsLowStock(p)).length;
    filterBar.innerHTML = `
      <button type="button" class="filter-chip ${!lowStockOnly ? 'active' : ''}" data-qo="lowstock-filter" data-low="0">
        すべて表示
      </button>
      <button type="button" class="filter-chip filter-chip-warn ${lowStockOnly ? 'active' : ''}" data-qo="lowstock-filter" data-low="1">
        ⚠️ 発注点割れのみ <span class="chip-badge">${lowCount}</span>
      </button>
    `;
  }
  renderFilterBar();
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qo="lowstock-filter"]');
    if (!btn) return;
    lowStockOnly = btn.dataset.low === '1';
    renderFilterBar();
    syncUrl();
    render();
  });

  // 検索
  window.addEventListener('qo-search', (e) => {
    searchQuery = (e.detail.q || '').trim();
    syncUrl();
    render();
  });

  function syncUrl() {
    const u = new URL(window.location.href);
    u.searchParams.delete('q'); u.searchParams.delete('cat'); u.searchParams.delete('lowstock');
    if (searchQuery) u.searchParams.set('q', searchQuery);
    if (activeCategory !== 'all') u.searchParams.set('cat', activeCategory);
    if (lowStockOnly) u.searchParams.set('lowstock', '1');
    window.history.replaceState(null, '', u.toString());
  }

  function render() {
    let list = QOStorage.getProducts(); // 在庫の最新値を都度取得
    if (activeCategory !== 'all') list = list.filter((p) => p.category === activeCategory);
    if (lowStockOnly) list = list.filter((p) => qoIsLowStock(p));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      );
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty" style="grid-column: 1 / -1;">
          <div class="empty-icon">🗂️</div>
          <h3>該当する商品が見つかりませんでした</h3>
          <p>カテゴリや検索キーワード、フィルタを変更してみてください。</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map((p) => {
      const out = qoIsOutOfStock(p);
      const low = qoIsLowStock(p);
      return `
      <article class="product-card ${low ? 'is-low' : ''}" data-id="${p.id}" data-sku="${escapeHtml(p.sku)}">
        <a class="product-card-img" href="product.html?sku=${encodeURIComponent(p.sku)}" data-qo="open-product" aria-label="${escapeHtml(p.name)}を開く">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
        </a>
        <div class="product-card-body">
          <span class="product-card-cat">${escapeHtml(p.category)}</span>
          <h3 class="product-card-name">
            <a href="product.html?sku=${encodeURIComponent(p.sku)}" data-qo="open-product">${escapeHtml(p.name)}</a>
          </h3>
          <div class="product-card-meta">型番: <code>${escapeHtml(p.sku)}</code> / ${escapeHtml(p.unit)}</div>
          <div class="product-card-stock">${shortStockBadge(p)} <span class="reorder-point">発注点 ${p.reorderPoint}</span></div>
          <div class="product-card-price-row">
            <div class="product-card-price">${QOCart.formatYen(p.price)}<small>(税抜)</small></div>
          </div>
        </div>
        <div class="product-card-action">
          <button type="button" class="btn btn-primary btn-block"
            data-qo="add-to-cart" data-sku="${escapeHtml(p.sku)}" data-id="${p.id}"
            ${out ? 'disabled' : ''}>
            <span aria-hidden="true">🛒</span> カートに入れる
          </button>
        </div>
      </article>
    `;}).join('');
  }

  grid.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-qo="add-to-cart"]');
    if (addBtn) {
      e.preventDefault();
      QOStorage.addToCart(addBtn.dataset.id, 1);
      QOUI.toast('カートに追加しました');
      QOUI.renderHeader({ showSearch: true, currentSearch: searchQuery });
    }
  });

  render();
}

/* ===== 商品詳細ページ ===== */
function initProductPage() {
  if (!QOAuth.requireLogin()) return;
  QOUI.renderHeader({ showSearch: false });

  const params = new URLSearchParams(window.location.search);
  // id でも sku でも開ける
  const product = QOStorage.resolveProduct(params.get('id') || params.get('sku'));
  const root = document.getElementById('detail-root');

  if (!product) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔍</div>
        <h3>商品が見つかりません</h3>
        <p><a href="index.html" class="btn btn-outline">トップに戻る</a></p>
      </div>`;
    return;
  }

  const taxIncl = Math.floor(product.price * 1.1);
  root.innerHTML = `
    <a href="index.html" class="back-link" data-qo="back">← 商品一覧に戻る</a>
    <div class="detail-wrap" data-qo="product" data-sku="${escapeHtml(product.sku)}">
      <div class="detail-img">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
      </div>
      <div>
        <span class="detail-cat">${escapeHtml(product.category)}</span>
        <h1 class="detail-name" data-qo="product-name">${escapeHtml(product.name)}</h1>
        <div class="detail-price-row">
          <div class="detail-price" data-qo="price">${QOCart.formatYen(product.price)}</div>
          <div class="detail-price-tax">税抜 / 税込 ${QOCart.formatYen(taxIncl)}</div>
        </div>
        <div class="detail-meta">
          <span><strong>型番</strong><code>${escapeHtml(product.sku)}</code></span>
          <span><strong>販売単位</strong>${escapeHtml(product.unit)}</span>
          <span><strong>在庫</strong>${stockBadge(product)}</span>
          <span><strong>発注点</strong>${product.reorderPoint} / <strong>推奨発注</strong>${product.reorderQty}</span>
        </div>
        <div class="detail-desc">${escapeHtml(product.description)}</div>
        <div class="qty-row">
          <label for="qty">数量</label>
          <div class="qty-input">
            <button type="button" id="qty-minus" data-qo="quantity-minus" aria-label="数量を減らす">−</button>
            <input id="qty" type="number" value="1" min="1" max="999" data-qo="quantity" aria-label="数量" />
            <button type="button" id="qty-plus" data-qo="quantity-plus" aria-label="数量を増やす">+</button>
          </div>
          <span class="suggest-hint">推奨ロット: ${product.reorderQty}</span>
        </div>
        <button type="button" id="add-cart" class="btn btn-primary btn-lg btn-block"
          data-qo="add-to-cart" data-sku="${escapeHtml(product.sku)}" data-id="${product.id}"
          ${qoIsOutOfStock(product) ? 'disabled' : ''}>
          <span aria-hidden="true">🛒</span> カートに入れる
        </button>
      </div>
    </div>
  `;

  const qty = document.getElementById('qty');
  document.getElementById('qty-minus').addEventListener('click', () => {
    qty.value = safeIntFrom(qty.value, 1) - 1 || 1;
    qty.value = Math.max(1, parseInt(qty.value, 10));
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qty.value = safeIntFrom(qty.value, 1) + 1;
  });
  qty.addEventListener('change', () => { qty.value = safeIntFrom(qty.value, 1); });

  document.getElementById('add-cart').addEventListener('click', () => {
    const n = safeIntFrom(qty.value, 1);
    QOStorage.addToCart(product.id, n);
    QOUI.toast(`${n}点 カートに追加しました`);
    QOUI.renderHeader({ showSearch: false });
  });
}

/* ===== カートページ ===== */
function initCartPage() {
  if (!QOAuth.requireLogin()) return;

  // URL一括追加: ?add=QO-PEN-B10:5,QO-PA4-500:2
  const params = new URLSearchParams(window.location.search);
  const addSpec = params.get('add');
  if (addSpec) {
    const result = QOStorage.addToCartFromQuery(addSpec);
    if (result.added.length > 0) {
      QOUI.toast(`${result.added.length}商品をカートに追加しました`);
    }
    if (result.notFound.length > 0) {
      console.warn('[Quick Office] 商品が見つかりませんでした:', result.notFound);
    }
    // URLからaddを除去
    const u = new URL(window.location.href);
    u.searchParams.delete('add');
    window.history.replaceState(null, '', u.toString());
  }

  QOUI.renderHeader({ showSearch: false });
  const root = document.getElementById('cart-root');

  function render() {
    const items = QOCart.resolveCart();
    if (items.length === 0) {
      root.innerHTML = `
        <div class="orders-container">
          <h1 class="page-title">カート</h1>
          <div class="empty">
            <div class="empty-icon">🛒</div>
            <h3>カートは空です</h3>
            <p>商品を選んでカートに入れてください。</p>
            <p><a href="index.html" class="btn btn-primary" data-qo="continue-shopping">商品を見る</a></p>
          </div>
        </div>`;
      return;
    }

    const subtotal = QOCart.calcSubtotal(items);
    const tax = QOCart.calcTax(subtotal);
    const total = QOCart.calcTotal(subtotal);

    root.innerHTML = `
      <div class="cart-layout">
        <div>
          <h1 class="page-title">カート (${items.length}点)</h1>
          <div class="cart-list" data-qo="cart-list">
            ${items.map((it) => `
              <div class="cart-row" data-qo="cart-row" data-pid="${it.productId}" data-sku="${escapeHtml(it.product.sku)}">
                <div class="cart-row-img"><img src="${escapeHtml(it.product.image)}" alt="${escapeHtml(it.product.name)}"></div>
                <div class="cart-row-info">
                  <h4 class="cart-row-name">${escapeHtml(it.product.name)}</h4>
                  <div class="cart-row-meta"><code>${escapeHtml(it.product.sku)}</code> / @${QOCart.formatYen(it.product.price)} (税抜)</div>
                </div>
                <div class="cart-row-qty">
                  <div class="qty-input">
                    <button type="button" data-qo="quantity-minus" data-act="minus" aria-label="数量を減らす">−</button>
                    <input type="number" value="${it.quantity}" min="1" max="999" data-qo="quantity" data-act="qty" aria-label="数量" />
                    <button type="button" data-qo="quantity-plus" data-act="plus" aria-label="数量を増やす">+</button>
                  </div>
                </div>
                <div class="cart-row-price" data-qo="line-total">${QOCart.formatYen(it.subtotal)}</div>
                <button type="button" class="cart-row-remove" data-qo="remove-from-cart" data-act="remove" aria-label="削除">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
        <aside class="cart-summary">
          <h3>注文サマリー</h3>
          <div class="summary-row"><span>小計 (税抜)</span><span data-qo="subtotal">${QOCart.formatYen(subtotal)}</span></div>
          <div class="summary-row"><span>消費税 (10%)</span><span data-qo="tax">${QOCart.formatYen(tax)}</span></div>
          <div class="summary-row"><span>送料</span><span>無料</span></div>
          <div class="summary-total"><span>合計 (税込)</span><b data-qo="total">${QOCart.formatYen(total)}</b></div>
          <button type="button" id="goto-checkout" class="btn btn-accent btn-lg btn-block" data-qo="goto-checkout" style="margin-top: 16px;">
            ご注文手続きへ →
          </button>
          <p style="font-size:11px;color:var(--color-text-muted);margin-top:8px;text-align:center;">
            ※デモ環境です。実際の決済は行われません。
          </p>
        </aside>
      </div>
    `;

    root.querySelectorAll('[data-qo="cart-row"]').forEach((row) => {
      const pid = row.dataset.pid;
      row.querySelector('[data-act="minus"]').addEventListener('click', () => {
        const item = QOStorage.getCart().find((c) => c.productId === pid);
        QOStorage.updateCartQuantity(pid, (item?.quantity || 1) - 1);
        render(); QOUI.renderHeader({ showSearch: false });
      });
      row.querySelector('[data-act="plus"]').addEventListener('click', () => {
        const item = QOStorage.getCart().find((c) => c.productId === pid);
        QOStorage.updateCartQuantity(pid, (item?.quantity || 0) + 1);
        render(); QOUI.renderHeader({ showSearch: false });
      });
      row.querySelector('[data-act="qty"]').addEventListener('change', (e) => {
        const n = safeIntFrom(e.target.value, 1);
        QOStorage.updateCartQuantity(pid, n);
        render(); QOUI.renderHeader({ showSearch: false });
      });
      row.querySelector('[data-act="remove"]').addEventListener('click', () => {
        QOStorage.removeFromCart(pid);
        render(); QOUI.renderHeader({ showSearch: false });
        QOUI.toast('カートから削除しました');
      });
    });

    document.getElementById('goto-checkout').addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }

  render();
}

/* ===== 注文確認ページ ===== */
function initCheckoutPage() {
  if (!QOAuth.requireLogin()) return;
  QOUI.renderHeader({ showSearch: false });
  const root = document.getElementById('checkout-root');

  // 都度カートを再取得して整合性を保つ
  const items = QOCart.resolveCart();
  if (items.length === 0) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🛒</div>
        <h3>カートが空のため注文できません</h3>
        <p><a href="index.html" class="btn btn-primary">商品を見る</a></p>
      </div>`;
    return;
  }

  const subtotal = QOCart.calcSubtotal(items);
  const tax = QOCart.calcTax(subtotal);
  const total = QOCart.calcTotal(subtotal);
  const defaults = QOStorage.getCheckoutDefaults();

  root.innerHTML = `
    <a href="cart.html" class="back-link" data-qo="back">← カートに戻る</a>
    <h1 class="page-title">ご注文内容の確認</h1>
    <div class="checkout-layout">
      <form id="checkout-form" class="checkout-form" data-qo="checkout-form" novalidate>
        <section class="form-section">
          <h2>お届け先・部署情報</h2>
          <div class="form-grid">
            <div class="field">
              <label for="ck-company">会社名</label>
              <input id="ck-company" name="company" data-qo="ck-company" value="${escapeHtml(defaults.company)}" required />
            </div>
            <div class="field">
              <label for="ck-department">部署</label>
              <input id="ck-department" name="department" data-qo="ck-department" value="${escapeHtml(defaults.department)}" />
            </div>
            <div class="field">
              <label for="ck-deptCode">部門コード</label>
              <input id="ck-deptCode" name="deptCode" data-qo="ck-deptCode" value="${escapeHtml(defaults.deptCode)}" />
            </div>
            <div class="field">
              <label for="ck-contactName">ご担当者名</label>
              <input id="ck-contactName" name="contactName" data-qo="ck-contactName" value="${escapeHtml(defaults.contactName)}" required />
            </div>
            <div class="field field-full">
              <label for="ck-address">お届け先住所</label>
              <input id="ck-address" name="address" data-qo="ck-address" value="${escapeHtml(defaults.address)}" required />
            </div>
            <div class="field">
              <label for="ck-phone">電話番号</label>
              <input id="ck-phone" name="phone" data-qo="ck-phone" value="${escapeHtml(defaults.phone)}" />
            </div>
            <div class="field">
              <label for="ck-desiredDate">希望納期</label>
              <select id="ck-desiredDate" name="desiredDate" data-qo="ck-desiredDate">
                <option ${defaults.desiredDate === '最短' ? 'selected' : ''}>最短</option>
                <option ${defaults.desiredDate === '翌日' ? 'selected' : ''}>翌日</option>
                <option ${defaults.desiredDate === '3営業日以内' ? 'selected' : ''}>3営業日以内</option>
                <option ${defaults.desiredDate === '1週間以内' ? 'selected' : ''}>1週間以内</option>
              </select>
            </div>
            <div class="field field-full">
              <label for="ck-note">備考</label>
              <textarea id="ck-note" name="note" data-qo="ck-note" rows="2" placeholder="特になし">${escapeHtml(defaults.note || '')}</textarea>
            </div>
          </div>
        </section>

        <section class="form-section">
          <h2>ご注文商品 (${items.length}点)</h2>
          <div class="checkout-items">
            ${items.map((it) => `
              <div class="checkout-item">
                <div class="ci-img"><img src="${escapeHtml(it.product.image)}" alt=""></div>
                <div class="ci-body">
                  <div class="ci-name">${escapeHtml(it.product.name)}</div>
                  <div class="ci-meta"><code>${escapeHtml(it.product.sku)}</code> × ${it.quantity} (@${QOCart.formatYen(it.product.price)})</div>
                </div>
                <div class="ci-sub">${QOCart.formatYen(it.subtotal)}</div>
              </div>
            `).join('')}
          </div>
        </section>
      </form>

      <aside class="cart-summary checkout-summary">
        <h3>お支払い金額</h3>
        <div class="summary-row"><span>小計 (税抜)</span><span>${QOCart.formatYen(subtotal)}</span></div>
        <div class="summary-row"><span>消費税 (10%)</span><span>${QOCart.formatYen(tax)}</span></div>
        <div class="summary-row"><span>送料</span><span>無料</span></div>
        <div class="summary-total"><span>合計 (税込)</span><b>${QOCart.formatYen(total)}</b></div>
        <button type="button" id="confirm-order" class="btn btn-accent btn-lg btn-block" data-qo="confirm-order" style="margin-top: 16px;">
          注文を確定する
        </button>
        <p style="font-size:11px;color:var(--color-text-muted);margin-top:8px;text-align:center;">
          ※デモ環境です。実際の決済・配送は行われません。
        </p>
      </aside>
    </div>
  `;

  document.getElementById('confirm-order').addEventListener('click', () => {
    const form = document.getElementById('checkout-form');
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.company?.trim() || !data.contactName?.trim() || !data.address?.trim()) {
      QOUI.toast('会社名・ご担当者名・住所は必須です');
      return;
    }
    QOStorage.saveCheckout(data);

    // 注文確定: 在庫を消費 → 注文記録 → カート空に
    const liveItems = QOCart.resolveCart();
    const liveSub = QOCart.calcSubtotal(liveItems);
    const liveTax = QOCart.calcTax(liveSub);
    const liveTotal = QOCart.calcTotal(liveSub);
    const orderNo = QOStorage.generateOrderNumber();
    const user = QOStorage.getUser();

    const order = {
      id: orderNo,
      date: new Date().toISOString(),
      user: { email: user.email, displayName: user.displayName },
      shipTo: {
        company: data.company, department: data.department, deptCode: data.deptCode,
        contactName: data.contactName, address: data.address, phone: data.phone,
        desiredDate: data.desiredDate, note: data.note,
      },
      items: liveItems.map((it) => ({
        productId: it.productId, name: it.product.name, sku: it.product.sku,
        unit: it.product.unit, price: it.product.price,
        quantity: it.quantity, subtotal: it.subtotal,
      })),
      subtotal: liveSub, tax: liveTax, total: liveTotal,
    };
    QOStorage.addOrder(order);
    // 教材として「在庫が補充される」演出
    QOStorage.consumeStockOnOrder(order.items);
    QOStorage.clearCart();
    window.location.href = `order-complete.html?id=${encodeURIComponent(orderNo)}`;
  });
}

/* ===== 注文完了ページ ===== */
function initOrderCompletePage() {
  if (!QOAuth.requireLogin()) return;
  QOUI.renderHeader({ showSearch: false });

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const order = QOStorage.getOrderById(id);
  const root = document.getElementById('complete-root');

  if (!order) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty-icon">❓</div>
        <h3>注文情報が見つかりません</h3>
        <p><a href="index.html" class="btn btn-outline">トップに戻る</a></p>
      </div>`;
    return;
  }

  root.innerHTML = `
    <div class="success-card" data-qo="order-complete" data-order-id="${escapeHtml(order.id)}">
      <div class="success-icon" aria-hidden="true">✓</div>
      <h1>ご注文ありがとうございました</h1>
      <p>注文を受け付けました。下記の注文番号でお問い合わせいただけます。</p>
      <div class="order-number" data-qo="order-id">${escapeHtml(order.id)}</div>

      <div style="text-align:left;background:var(--color-bg-soft);padding:16px 20px;border-radius:8px;margin: 16px 0 8px;">
        <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px;">注文サマリー</div>
        ${order.items.map((it) => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13.5px;">
            <span>${escapeHtml(it.name)} × ${it.quantity}</span>
            <span style="font-weight:600;">${QOCart.formatYen(it.subtotal)}</span>
          </div>
        `).join('')}
        <div style="border-top:1px solid var(--color-border);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:700;">
          <span>合計 (税込)</span><span>${QOCart.formatYen(order.total)}</span>
        </div>
      </div>

      <div class="success-actions">
        <button type="button" id="dl-receipt" class="btn btn-accent btn-lg" data-qo="download-receipt">
          <span aria-hidden="true">📄</span> 領収書をダウンロード
        </button>
        <a href="index.html" class="btn btn-outline btn-lg" data-qo="goto-home">トップに戻る</a>
        <a href="orders.html" class="btn btn-ghost btn-lg" data-qo="goto-orders">注文履歴</a>
      </div>
    </div>
  `;

  document.getElementById('dl-receipt').addEventListener('click', () => {
    QOReceipt.requestDownload(order, { returnTo: window.location.href });
  });
}

/* ===== 注文履歴ページ ===== */
function initOrdersPage() {
  if (!QOAuth.requireLogin()) return;
  QOUI.renderHeader({ showSearch: false });

  const root = document.getElementById('orders-root');
  const orders = QOStorage.getOrders();

  // ?download=last で最新注文の領収書を自動DL
  const params = new URLSearchParams(window.location.search);
  const dl = params.get('download');
  if (dl && orders.length > 0) {
    let target = null;
    if (dl === 'last') target = orders[0];
    else target = QOStorage.getOrderById(dl);
    if (target) {
      // ライブラリの読み込み完了を待ってからDL
      const tryDl = () => {
        if (typeof html2canvas !== 'undefined' && typeof window.jspdf !== 'undefined') {
          QOReceipt.requestDownload(target, { returnTo: window.location.href });
        } else {
          setTimeout(tryDl, 200);
        }
      };
      setTimeout(tryDl, 100);
    }
  }

  if (orders.length === 0) {
    root.innerHTML = `
      <h1 class="page-title">注文履歴</h1>
      <div class="empty">
        <div class="empty-icon">📋</div>
        <h3>注文履歴はまだありません</h3>
        <p>商品を注文すると、ここに履歴が表示されます。</p>
        <p><a href="index.html" class="btn btn-primary">商品を見る</a></p>
      </div>`;
    return;
  }

  root.innerHTML = `
    <h1 class="page-title">注文履歴 (${orders.length}件)</h1>
    ${orders.map((o) => {
      const d = new Date(o.date);
      const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `
        <div class="order-card" data-qo="order" data-order-id="${escapeHtml(o.id)}">
          <div class="order-card-head">
            <div>
              <div class="order-id" data-qo="order-id">${escapeHtml(o.id)}</div>
              <div class="order-date">${dateStr} / ${escapeHtml(o.shipTo?.company || '')}</div>
            </div>
            <div class="order-total">${QOCart.formatYen(o.total)} <small style="font-weight:400;color:var(--color-text-muted);">(税込)</small></div>
          </div>
          <div class="order-items">
            ${o.items.map((it) => `
              <div class="item-line">
                <span>${escapeHtml(it.name)} × ${it.quantity}</span>
                <span>${QOCart.formatYen(it.subtotal)}</span>
              </div>
            `).join('')}
          </div>
          <div class="order-actions">
            <button type="button" class="btn btn-accent" data-qo="download-receipt" data-receipt="${escapeHtml(o.id)}">
              <span aria-hidden="true">📄</span> 領収書ダウンロード
            </button>
          </div>
        </div>
      `;
    }).join('')}
  `;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-receipt]');
    if (!btn) return;
    const id = btn.dataset.receipt;
    const order = QOStorage.getOrderById(id);
    if (order) QOReceipt.requestDownload(order, { returnTo: window.location.href });
  });
}

/* ===== 発行元情報 設定ページ ===== */
function initSettingsPage() {
  if (!QOAuth.requireLogin()) return;
  QOUI.renderHeader({ showSearch: false });

  const root = document.getElementById('settings-root');
  const current = QOStorage.getIssuer() || {};

  // ?next=...&return=... があれば「保存後に戻る」
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('return');
  const wasUnconfigured = !QOStorage.isIssuerConfigured();

  root.innerHTML = `
    <a href="index.html" class="back-link" data-qo="back">← 商品一覧に戻る</a>
    <h1 class="page-title">発行元情報の設定</h1>
    <p style="color:var(--color-text-soft);margin:-12px 0 var(--space-5);max-width:640px;font-size:13.5px;">
      領収書PDFに記載される<strong>発行元の情報</strong>を入力してください。<br>
      ここで入力した内容は、ブラウザの localStorage に保存され、領収書発行時に反映されます。
    </p>

    ${wasUnconfigured ? `
      <div class="notice notice-warn" data-qo="notice-unconfigured" role="alert">
        <span aria-hidden="true">⚠️</span> 発行元情報がまだ設定されていません。最低でも<strong>会社名</strong>と<strong>代表者名</strong>を入力してください。
      </div>
    ` : ''}

    <div class="form-section">
      <form id="issuer-form" data-qo="issuer-form" novalidate>
        <div class="form-grid">
          ${QO_ISSUER_FIELDS.map((f) => {
            const fullCol = (f.key === 'address' || f.key === 'invoiceNo') ? 'field-full' : '';
            return `
            <div class="field ${fullCol}">
              <label for="issuer-${f.key}">
                ${escapeHtml(f.label)}${f.required ? ' <span style="color:var(--color-danger);">*</span>' : ''}
              </label>
              <input type="text" id="issuer-${f.key}" name="${f.key}" data-qo="issuer-${f.key}"
                placeholder="${escapeHtml(f.placeholder || '')}"
                value="${escapeHtml(current[f.key] || '')}" />
              ${f.help ? `<span class="field-help">${escapeHtml(f.help)}</span>` : ''}
            </div>
          `;}).join('')}
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-lg" data-qo="issuer-save">
            <span aria-hidden="true">💾</span> 保存する
          </button>
          ${returnTo ? `<a href="${escapeHtml(returnTo)}" class="btn btn-outline btn-lg" data-qo="issuer-back">戻る</a>` : ''}
          <button type="button" class="btn btn-ghost" data-qo="issuer-clear" id="issuer-clear">クリア</button>
        </div>
        <div class="field-error" id="issuer-error" role="alert" style="margin-top: var(--space-3);"></div>
      </form>
    </div>
  `;

  const form = document.getElementById('issuer-form');
  const errorEl = document.getElementById('issuer-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const data = Object.fromEntries(new FormData(form).entries());
    // バリデーション
    if (!data.companyName?.trim()) {
      errorEl.textContent = '会社名 / 屋号は必須です。';
      document.getElementById('issuer-companyName').focus();
      return;
    }
    if (!data.representative?.trim()) {
      errorEl.textContent = '代表者名は必須です。';
      document.getElementById('issuer-representative').focus();
      return;
    }
    // インボイス番号: 入力があれば形式チェック(T+13桁)
    if (data.invoiceNo && data.invoiceNo.trim()) {
      const inv = data.invoiceNo.trim();
      if (!/^T\d{13}$/.test(inv)) {
        errorEl.textContent = '登録番号は「T」+ 13桁の数字で入力してください(例: T1234567890123)。';
        document.getElementById('issuer-invoiceNo').focus();
        return;
      }
    }
    QOStorage.saveIssuer(data);
    QOUI.toast('発行元情報を保存しました');
    if (returnTo) {
      setTimeout(() => { window.location.href = returnTo; }, 600);
    } else {
      // ヘッダーバッジを更新するため再描画
      QOUI.renderHeader({ showSearch: false });
    }
  });

  document.getElementById('issuer-clear').addEventListener('click', () => {
    if (!confirm('入力中の値をすべてクリアします。よろしいですか?')) return;
    QO_ISSUER_FIELDS.forEach((f) => {
      const input = document.getElementById('issuer-' + f.key);
      if (input) input.value = '';
    });
  });
}

/* ===== モーダル: 発行元未設定 警告 ===== */
function showIssuerRequiredModal({ returnTo } = {}) {
  // 既存があれば破棄
  document.getElementById('qo-modal')?.remove();

  const settingsHref = `settings.html${returnTo ? '?return=' + encodeURIComponent(returnTo) : ''}`;
  const overlay = document.createElement('div');
  overlay.id = 'qo-modal';
  overlay.className = 'qo-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'qo-modal-title');
  overlay.innerHTML = `
    <div class="qo-modal" data-qo="issuer-required-modal">
      <div class="qo-modal-icon" aria-hidden="true">⚠️</div>
      <h2 id="qo-modal-title">領収書の発行元情報が未設定です</h2>
      <p>
        領収書PDFには「会社名 / 屋号」「代表者名」など、<strong>発行元の情報</strong>を記載する必要があります。<br>
        まずは発行元情報を入力してから、改めて領収書をダウンロードしてください。
      </p>
      <div class="qo-modal-actions">
        <a href="${escapeHtml(settingsHref)}" class="btn btn-primary btn-lg" data-qo="goto-issuer-settings">
          <span aria-hidden="true">🏢</span> 発行元情報を入力する
        </a>
        <button type="button" class="btn btn-ghost" data-qo="modal-close">閉じる</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('[data-qo="modal-close"]').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
}
