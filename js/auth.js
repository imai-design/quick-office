/* ===== Quick Office 認証関連 ===== */
const QOAuth = {
  isLoggedIn() {
    return !!QOStorage.getUser();
  },
  // ログインしていない場合は login.html に飛ばす
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
  login(email, password) {
    if (!email || !email.trim()) {
      return { ok: false, message: 'メールアドレスを入力してください。' };
    }
    if (!password) {
      return { ok: false, message: 'パスワードを入力してください。' };
    }
    // ダミー認証: 何でもOK。表示名はメアドのローカル部から生成
    const localPart = email.split('@')[0] || 'お客様';
    const displayName = localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const user = {
      email: email.trim(),
      displayName,
      loggedInAt: new Date().toISOString(),
    };
    QOStorage.setUser(user);
    return { ok: true, user };
  },
  logout() {
    QOStorage.clearUser();
    QOStorage.clearCart();
    window.location.href = 'login.html';
  },
};
