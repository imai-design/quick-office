/* ===== 領収書 PDF ダウンロード =====
 * html2canvas で日本語入りHTMLを画像化 → jsPDF で PDF 化することで、
 * 日本語フォント埋め込みなしに文字化けを完全回避する。
 *
 * requestDownload() = 発行元情報の未設定チェックを通してから download() へ
 * download()        = 実際にPDFを生成する低レイヤー
 */
const QOReceipt = {
  formatDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  // 発行元情報未設定チェック → モーダル誘導 or download実行
  requestDownload(order, opts = {}) {
    if (!QOStorage.isIssuerConfigured()) {
      if (typeof showIssuerRequiredModal === 'function') {
        showIssuerRequiredModal({ returnTo: opts.returnTo });
      } else {
        alert('領収書の発行元情報が未設定です。settings.html で先に入力してください。');
      }
      return;
    }
    return this.download(order, opts);
  },

  buildIssuerBlock(issuer) {
    if (!issuer) return '';
    const lines = [];
    if (issuer.companyName) lines.push(`<div class="corp">${escapeHtml(issuer.companyName)}</div>`);
    if (issuer.representative) lines.push(`<div>代表者: ${escapeHtml(issuer.representative)}</div>`);
    const addr = [issuer.postalCode ? `〒${escapeHtml(issuer.postalCode)}` : '', issuer.address ? escapeHtml(issuer.address) : '']
      .filter(Boolean).join(' ');
    if (addr) lines.push(`<div>${addr}</div>`);
    const contacts = [];
    if (issuer.tel)   contacts.push(`TEL: ${escapeHtml(issuer.tel)}`);
    if (issuer.email) contacts.push(`Email: ${escapeHtml(issuer.email)}`);
    if (contacts.length) lines.push(`<div>${contacts.join(' / ')}</div>`);
    if (issuer.invoiceNo) lines.push(`<div>登録番号: ${escapeHtml(issuer.invoiceNo)}</div>`);
    return lines.join('');
  },

  buildReceiptElement(order) {
    const issueDate = this.formatDate(order.date);
    const total = order.total;
    const tax = order.tax;
    const subtotal = order.subtotal;
    const shipTo = order.shipTo || {};
    const issuer = QOStorage.getIssuer() || {};

    const html = `
      <h1>領 収 書</h1>
      <div class="receipt-stamp">領収<br>済</div>
      <div class="receipt-meta">
        <div><strong>発行日:</strong> ${issueDate}</div>
        <div><strong>領収書番号:</strong> ${escapeHtml(order.id)}</div>
      </div>

      <div class="receipt-to">${escapeHtml(shipTo.company || order.user.displayName)} 御中</div>
      ${shipTo.department ? `<div style="font-size:13px;margin-bottom:12px;color:#475569;">${escapeHtml(shipTo.department)} ${shipTo.contactName ? '/ ' + escapeHtml(shipTo.contactName) + ' 様' : ''}</div>` : ''}

      <div class="receipt-amount-box">
        <div class="label">領収金額(税込)</div>
        <div class="amount">¥ ${total.toLocaleString('ja-JP')}-</div>
      </div>

      <div style="margin: 16px 0;">
        <strong>但し書き:</strong> オフィス用品代として 上記正に領収いたしました。
      </div>

      <table class="receipt-table">
        <thead>
          <tr>
            <th style="width: 50%;">品名</th>
            <th class="num" style="width: 12%;">数量</th>
            <th class="num" style="width: 18%;">単価(税抜)</th>
            <th class="num" style="width: 20%;">小計</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((it) => `
            <tr>
              <td>${escapeHtml(it.name)}<br><span style="font-size:10px;color:#64748b;">${escapeHtml(it.sku)} / ${escapeHtml(it.unit)}</span></td>
              <td class="num">${it.quantity}</td>
              <td class="num">¥${it.price.toLocaleString('ja-JP')}</td>
              <td class="num">¥${it.subtotal.toLocaleString('ja-JP')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="receipt-totals">
        <div class="row"><span>小計(税抜)</span><span>¥${subtotal.toLocaleString('ja-JP')}</span></div>
        <div class="row"><span>消費税(10%)</span><span>¥${tax.toLocaleString('ja-JP')}</span></div>
        <div class="row total"><span>合計(税込)</span><span>¥${total.toLocaleString('ja-JP')}</span></div>
      </div>

      <div class="receipt-footer">
        <div class="receipt-issuer-label">[発行元]</div>
        ${this.buildIssuerBlock(issuer)}
      </div>
    `;

    const wrap = document.createElement('div');
    wrap.className = 'receipt-render';
    wrap.id = 'receipt-render-target';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    return wrap;
  },

  async download(order) {
    if (!order) return;

    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      alert('PDFライブラリが読み込まれていません。vendor/ フォルダを確認してください。');
      return;
    }

    const target = this.buildReceiptElement(order);
    if (typeof QOUI !== 'undefined') QOUI.toast('領収書を生成中…');

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: false,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgW = canvas.width;
      const imgH = canvas.height;
      const drawW = pageWidth - 20;
      const drawH = drawW / (imgW / imgH);

      if (drawH <= pageHeight - 20) {
        pdf.addImage(imgData, 'PNG', 10, 10, drawW, drawH);
      } else {
        const totalPages = Math.ceil(drawH / (pageHeight - 20));
        const pieceH = (pageHeight - 20);
        const pieceImgH = pieceH * (imgH / drawH);
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();
          const partCanvas = document.createElement('canvas');
          partCanvas.width = imgW;
          partCanvas.height = Math.min(pieceImgH, imgH - i * pieceImgH);
          const ctx = partCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, i * pieceImgH, imgW, partCanvas.height, 0, 0, imgW, partCanvas.height);
          const partImg = partCanvas.toDataURL('image/png');
          pdf.addImage(partImg, 'PNG', 10, 10, drawW, partCanvas.height * (drawW / imgW));
        }
      }

      const filename = `${order.id}_receipt.pdf`;
      pdf.save(filename);
      if (typeof QOUI !== 'undefined') QOUI.toast('領収書をダウンロードしました');
    } catch (err) {
      console.error(err);
      alert('領収書の生成に失敗しました: ' + err.message);
    } finally {
      target.remove();
    }
  },
};
