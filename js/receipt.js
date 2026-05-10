/* ===== 領収書 PDF ダウンロード =====
 * html2canvas で日本語入りHTMLを画像化 → jsPDF で PDF 化することで、
 * 日本語フォント埋め込みなしに文字化けを完全回避する。
 * 画像はテキストのみ(SVGアイコン含めない)で構築するためCORS問題は発生しない。
 */
const QOReceipt = {
  formatDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  buildReceiptElement(order) {
    const issueDate = this.formatDate(order.date);
    const total = order.total;
    const tax = order.tax;
    const subtotal = order.subtotal;
    const shipTo = order.shipTo || {};

    const html = `
      <h1>領 収 書</h1>
      <div class="receipt-stamp">領収<br>済</div>
      <div class="receipt-meta">
        <div><strong>発行日:</strong> ${issueDate}</div>
        <div><strong>領収書番号:</strong> ${order.id}</div>
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
        <div class="corp">Quick Office 株式会社</div>
        〒100-0001 東京都千代田区千代田1-1-1 Quick Office Tower 10F<br>
        TEL: 03-XXXX-XXXX / Email: support@quick-office.example<br>
        登録番号: T1234567890123
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
      const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

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
