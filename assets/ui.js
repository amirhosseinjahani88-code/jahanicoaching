/* ابزارهای رابط کاربری: قالب‌بندی اعداد، نمودار، توست، مودال و چیدمان مشترک. */

const UI = (() => {
  const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  function fa(value) {
    return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
  }

  /* اعشار در فارسی با ممیز «٫» نوشته می‌شود، نه نقطه */
  function faDecimal(value) {
    return fa(String(value).replace(".", "٫"));
  }

  function group(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "٫");
  }

  function num(value) {
    return fa(group(value));
  }

  function money(toman) {
    return `${num(Math.round(toman))} تومان`;
  }

  function millions(toman) {
    const m = toman / 1000000;
    const text = m >= 100 ? m.toFixed(0) : m.toFixed(m % 1 === 0 ? 0 : 1);
    return `${faDecimal(text)} میلیون تومان`;
  }

  function secs(value, digits = 1) {
    return faDecimal(Number(value).toFixed(digits));
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initials(name) {
    const parts = String(name).trim().split(" ");
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  }

  /* ---------- توست و مودال ---------- */

  let toastTimer = null;

  function toast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    document.body.append(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.remove(), 3200);
  }

  function modal(title, bodyHtml, footerHtml) {
    closeModal();
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="space-between">
          <h3 class="title-md">${title}</h3>
          <button class="btn-quiet" data-action="modal:close">بستن ✕</button>
        </div>
        <div class="divider"></div>
        <div class="stack">${bodyHtml}</div>
        ${footerHtml ? `<div class="row" style="justify-content:flex-end">${footerHtml}</div>` : ""}
      </div>`;
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) closeModal();
    });
    document.body.append(wrap);
  }

  function closeModal() {
    const open = document.querySelector(".modal-backdrop");
    if (open) open.remove();
  }

  /* ---------- نمودارها ---------- */

  function lineChart({ labels, values, betterIsLower = false, unit = "", height = 220 }) {
    const width = 640;
    const padX = 44;
    const padY = 26;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const points = values.map((v, i) => {
      const x = padX + (i * (width - padX * 2)) / Math.max(1, values.length - 1);
      const ratio = (v - min) / span;
      const y = betterIsLower
        ? padY + ratio * (height - padY * 2)
        : height - padY - ratio * (height - padY * 2);
      return { x, y, v, label: labels[i] };
    });
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${path} L${points[points.length - 1].x.toFixed(1)},${height - padY} L${points[0].x.toFixed(1)},${height - padY} Z`;
    return `
      <svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="نمودار روند">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#0a84ff" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#00d2ff" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="#e2e8f0" />
        <path d="${area}" fill="url(#chartFill)" />
        <path d="${path}" fill="none" stroke="#0a84ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        ${points
          .map(
            (p) => `
          <g>
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#fff" stroke="#0a84ff" stroke-width="3">
              <title>${escapeHtml(p.label)}: ${secs(p.v)} ${escapeHtml(unit)}</title>
            </circle>
            <text x="${p.x.toFixed(1)}" y="${(p.y - 14).toFixed(1)}" text-anchor="middle" font-size="13" fill="#0b192c">${secs(p.v)}</text>
            <text x="${p.x.toFixed(1)}" y="${height - padY + 18}" text-anchor="middle" font-size="12" fill="#64748b">${escapeHtml(p.label)}</text>
          </g>`
          )
          .join("")}
      </svg>`;
  }

  function barChart({ labels, series, height = 240 }) {
    const width = 640;
    const padX = 40;
    const padY = 28;
    const groups = labels.length;
    const slot = (width - padX * 2) / groups;
    const maxValue = Math.max(...series.flatMap((s) => s.values), 1);
    const barW = Math.min(18, slot / (series.length + 1));
    return `
      <svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="نمودار میله‌ای">
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="#e2e8f0" />
        ${labels
          .map((label, i) => {
            const baseX = padX + i * slot + slot / 2;
            const bars = series
              .map((s, si) => {
                const value = s.values[i];
                const h = (value / maxValue) * (height - padY * 2);
                const x = baseX - (series.length * barW) / 2 + si * barW;
                return `<rect x="${x.toFixed(1)}" y="${(height - padY - h).toFixed(1)}" width="${(barW - 3).toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${s.color}"><title>${escapeHtml(s.name)} ${escapeHtml(label)}: ${fa(value)}</title></rect>`;
              })
              .join("");
            return `${bars}<text x="${baseX.toFixed(1)}" y="${height - padY + 18}" text-anchor="middle" font-size="12" fill="#64748b">${escapeHtml(label)}</text>`;
          })
          .join("")}
      </svg>
      <div class="row" style="gap:1rem">
        ${series.map((s) => `<span class="row" style="gap:.4rem"><span style="width:12px;height:12px;border-radius:4px;background:${s.color}"></span>${escapeHtml(s.name)}</span>`).join("")}
      </div>`;
  }

  function progressBar(percent, label) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    return `
      <div class="stack" style="gap:.35rem">
        ${label ? `<div class="space-between"><span class="muted">${label}</span><strong class="num">${fa(clamped)}٪</strong></div>` : ""}
        <div class="progress"><span style="width:${clamped}%"></span></div>
      </div>`;
  }

  /* ---------- چیدمان ---------- */

  const COACH_NAV = [
    { hash: "#/app", label: "کاکپیت", pro: false },
    { hash: "#/app/attendance", label: "حضور و غیاب", pro: false },
    { hash: "#/app/students", label: "شاگردان", pro: false },
    { hash: "#/app/sessions", label: "جلسات", pro: false },
    { hash: "#/app/workout", label: "تمرین‌نویسی", pro: false },
    { hash: "#/app/biomech", label: "آنالیز بیومکانیک", pro: true },
    { hash: "#/app/finance", label: "دستیار مالی", pro: true },
    { hash: "#/app/vault", label: "آرشیو متدولوژی", pro: true },
    { hash: "#/app/profile", label: "حساب من", pro: false },
  ];

  function shell(activeHash, content) {
    const ghostBanner = SJ.isGhost()
      ? `<div class="ghost-banner">
           <span>⚠️ ورود مدیریتی به حساب ${escapeHtml(SJ.coachName())} — تغییرات ثبت می‌شود.</span>
           <button class="btn-white btn-sm" data-action="ghost:exit">بازگشت به پنل مدیریت</button>
         </div>`
      : "";
    const planBadge = SJ.isPro()
      ? '<span class="badge badge-blue">مستری پرو</span>'
      : '<span class="badge badge-warn">اسنشیال</span>';
    return `
      ${ghostBanner}
      <header class="topbar">
        <div class="topbar-inner">
          <button class="brand" data-action="go" data-hash="#/app">
            <span class="brand-mark">🏊</span>
            <span>شنا جهانی</span>
          </button>
          <nav class="nav" aria-label="صفحات مربی">
            ${COACH_NAV.map(
              (item) => `<button data-action="go" data-hash="${item.hash}" ${activeHash === item.hash ? 'aria-current="page"' : ""}>${item.label}${item.pro && !SJ.isPro() ? " 🔒" : ""}</button>`
            ).join("")}
          </nav>
          <div class="topbar-actions">
            ${planBadge}
            <button class="btn-quiet" data-action="auth:logout">خروج</button>
          </div>
          <button class="nav-toggle" data-action="nav:toggle" aria-expanded="false" aria-label="باز کردن منو">☰</button>
        </div>
      </header>
      <main class="page">${content}</main>`;
  }

  function publicShell(content, { dark = false } = {}) {
    return `<div class="${dark ? "dark-page" : ""}">${content}</div>`;
  }

  function gate(title, description) {
    return `
      <div class="card gate">
        <span class="badge badge-warn">قابلیت پلن مستری پرو</span>
        <h2 class="title-lg">${title}</h2>
        <p class="muted">${description}</p>
        <ul class="plan-list muted">
          ${PLANS.pro.features.slice(0, 5).map((f) => `<li>${f}</li>`).join("")}
        </ul>
        <div class="row">
          <button class="btn-primary" data-action="plan:upgrade">ارتقا به مستری پرو (${PLANS.pro.priceLabel})</button>
          <button class="btn-quiet" data-action="go" data-hash="#/pricing">مقایسه پلن‌ها</button>
        </div>
      </div>`;
  }

  function sectionTitle(title, subtitle, backHash) {
    return `
      <div class="stack" style="gap:.35rem">
        ${backHash ? `<button class="btn-quiet" data-action="go" data-hash="${backHash}">→ بازگشت</button>` : ""}
        <h1 class="title-xl">${title}</h1>
        ${subtitle ? `<p class="muted">${subtitle}</p>` : ""}
      </div>`;
  }

  function kpi(label, value, hint, tone = "", hash = "") {
    const inner = `
        <span class="muted">${label}</span>
        <strong class="stat num">${value}</strong>
        ${hint ? `<span class="muted" style="font-size:.92rem">${hint}</span>` : ""}`;
    if (hash) {
      return `<button class="card kpi kpi-link ${tone}" data-action="go" data-hash="${hash}">${inner}</button>`;
    }
    return `<div class="card kpi ${tone}">${inner}</div>`;
  }

  function navigate(hash) {
    if (window.location.hash === hash) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = hash;
    }
  }

  return {
    fa,
    faDecimal,
    num,
    money,
    millions,
    secs,
    escapeHtml,
    initials,
    toast,
    modal,
    closeModal,
    lineChart,
    barChart,
    progressBar,
    shell,
    publicShell,
    gate,
    sectionTitle,
    kpi,
    navigate,
    COACH_NAV,
  };
})();
