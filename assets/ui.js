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
            <text x="${p.x.toFixed(1)}" y="${(p.y - 14).toFixed(1)}" text-anchor="middle" font-size="13" fill="currentColor">${secs(p.v)}</text>
            <text x="${p.x.toFixed(1)}" y="${height - padY + 18}" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.72">${escapeHtml(p.label)}</text>
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
            return `${bars}<text x="${baseX.toFixed(1)}" y="${height - padY + 18}" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.72">${escapeHtml(label)}</text>`;
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
    { hash: "#/app", label: "کاکپیت", icon: "cockpit" },
    { hash: "#/app/students", label: "شاگردان", icon: "swimmers" },
    { hash: "#/app/attendance", label: "حضور و غیاب", icon: "attendance" },
    { hash: "#/app/sessions", label: "جلسات", icon: "sessions" },
    { hash: "#/app/workout", label: "تمرین‌نویسی", icon: "workout" },
    { hash: "#/app/biomech", label: "آنالیز بیومکانیک", icon: "biomech", pro: true },
    { hash: "#/app/finance", label: "مالی", icon: "finance", pro: true },
    { hash: "#/app/vault", label: "آرشیو متدولوژی", icon: "vault", pro: true },
  ];

  function navIcon(name) {
    const paths = {
      cockpit: `<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="4.5" rx="1.6"/><rect x="14" y="10.5" width="7" height="10.5" rx="1.6"/><rect x="3" y="13" width="7" height="8" rx="1.6"/>`,
      swimmers: `<circle cx="9" cy="8" r="2.7"/><circle cx="16" cy="9" r="2"/><path d="M3.8 19c.5-2.6 2.6-4 5.2-4s4.7 1.4 5.2 4"/><path d="M14.2 15c1.5-.4 3 .2 4 1.6.5.7.9 1.6 1 2.4"/>`,
      attendance: `<rect x="4" y="3.5" width="16" height="17" rx="2.4"/><path d="M8 12.2l2.4 2.4 5.2-5.4"/>`,
      sessions: `<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3.2v3.2M16 3.2v3.2M3.5 10h17"/>`,
      workout: `<path d="M4 16c1.8 0 1.8-2 3.6-2s1.8 2 3.6 2 1.8-2 3.6-2 1.8 2 3.6 2 1.6-2 3.6-2"/><path d="M4 20c1.8 0 1.8-2 3.6-2s1.8 2 3.6 2 1.8-2 3.6-2 1.8 2 3.6 2 1.6-2 3.6-2"/><circle cx="17.5" cy="6.5" r="2.2"/>`,
      biomech: `<path d="M3 16.5 8 10l4 3.2 4.2-6.2L21 11"/>`,
      finance: `<rect x="3" y="6" width="18" height="12.5" rx="2"/><path d="M3 10.2h18M7 15h4"/>`,
      vault: `<path d="M5 4.5h12.5A2.5 2.5 0 0 1 20 7v12.5H7.2A2.2 2.2 0 0 0 5 21.7z"/><path d="M5 4.5A2.2 2.2 0 0 1 7.2 6.7H20"/>`,
      lock: `<rect x="6" y="11" width="12" height="8" rx="1.6"/><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11"/>`,
    };
    return `<svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
  }

  function navItemActive(item, activeHash) {
    if (item.hash === "#/app") return activeHash === "#/app";
    if (item.hash === "#/app/students") {
      return activeHash === item.hash || activeHash.startsWith("#/app/student/");
    }
    return activeHash === item.hash;
  }

  function prefSwitch() {
    const prefs = Prefs.get();
    return `
      <div class="pref-switch" role="group" aria-label="${t("روشن")}">
        <button type="button" class="pref-btn ${prefs.lang === "fa" ? "is-on" : ""}" data-action="pref:lang" data-lang="fa">فا</button>
        <button type="button" class="pref-btn ${prefs.lang === "en" ? "is-on" : ""}" data-action="pref:lang" data-lang="en">EN</button>
        <span class="pref-gap" aria-hidden="true"></span>
        <button type="button" class="pref-btn ${prefs.theme === "light" ? "is-on" : ""}" data-action="pref:theme" data-theme="light" aria-label="${t("روشن")}">☀</button>
        <button type="button" class="pref-btn ${prefs.theme === "dark" ? "is-on" : ""}" data-action="pref:theme" data-theme="dark" aria-label="${t("تیره")}">☾</button>
      </div>`;
  }

  function navButton(item, activeHash) {
    const locked = item.pro && !SJ.isPro();
    const current = navItemActive(item, activeHash);
    return `<button data-action="go" data-hash="${item.hash}" ${current ? 'aria-current="page"' : ""}>${t(item.label)}${locked ? " 🔒" : ""}</button>`;
  }

  function renderCoachNav(activeHash) {
    return COACH_NAV.map((item) => {
      const locked = item.pro && !SJ.isPro();
      const current = navItemActive(item, activeHash);
      const label = t(item.label);
      return `<button data-action="go" data-hash="${item.hash}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${current ? 'aria-current="page"' : ""}>${navIcon(item.icon)}${locked ? navIcon("lock") : ""}</button>`;
    }).join("");
  }

  function renderDesktopNav(activeHash) {
    const groups = [
      { hash: "#/app", label: "کاکپیت" },
      {
        id: "club",
        label: "باشگاه",
        children: [
          { hash: "#/app/students", label: "شاگردان" },
          { hash: "#/app/attendance", label: "حضور و غیاب" },
          { hash: "#/app/sessions", label: "جلسات" },
        ],
      },
      {
        id: "training",
        label: "تمرین",
        children: [
          { hash: "#/app/workout", label: "تمرین‌نویسی" },
          { hash: "#/app/biomech", label: "آنالیز بیومکانیک", pro: true },
          { hash: "#/app/vault", label: "آرشیو متدولوژی", pro: true },
        ],
      },
      { hash: "#/app/finance", label: "مالی", pro: true },
    ];
    return groups
      .map((item) => {
        if (!item.children) return navButton(item, activeHash);
        const open = item.children.some((child) => navItemActive(child, activeHash));
        return `
          <div class="nav-group${open ? " is-current" : ""}" data-group="${item.id}">
            <button class="nav-group-btn" data-action="nav:menu" data-group="${item.id}" aria-expanded="false">
              ${t(item.label)} <span class="nav-caret">▾</span>
            </button>
            <div class="nav-submenu" role="menu">
              ${item.children.map((child) => navButton(child, activeHash)).join("")}
            </div>
          </div>`;
      })
      .join("");
  }

  function shell(activeHash, content) {
    const ghostBanner = SJ.isGhost()
      ? `<div class="ghost-banner">
           <span>⚠️ ورود مدیریتی به حساب ${escapeHtml(SJ.coachName())} — تغییرات ثبت می‌شود.</span>
           <button class="btn-white btn-sm" data-action="ghost:exit">بازگشت به پنل مدیریت</button>
         </div>`
      : "";
    const planBadge = SJ.isPro()
      ? `<span class="badge badge-blue">${t("مستری پرو")}</span>`
      : `<span class="badge badge-warn">${t("اقتصادی")}</span>`;
    return `
      ${ghostBanner}
      <div class="panel-app">
        <div class="panel-chrome">
          <header class="topbar topbar-panel">
            <div class="topbar-inner">
              <button class="brand" data-action="go" data-hash="#/app">
                <span class="brand-mark">🏊</span>
                <span class="brand-name">${PLATFORM.name}</span>
              </button>
              <nav class="nav" aria-label="${t("صفحات مربی")}">
                ${renderDesktopNav(activeHash)}
              </nav>
              <div class="topbar-actions">
                ${prefSwitch()}
                <div class="nav-group nav-group-account" data-group="account">
                  <button class="nav-group-btn" data-action="nav:menu" data-group="account" aria-expanded="false">
                    <span class="account-label">${escapeHtml(SJ.coachName())}</span>
                    ${planBadge} <span class="nav-caret">▾</span>
                  </button>
                  <div class="nav-submenu" role="menu">
                    <button data-action="go" data-hash="#/app/profile" ${activeHash === "#/app/profile" ? 'aria-current="page"' : ""}>${t("حساب من")}</button>
                    <button data-action="auth:logout">${t("خروج")}</button>
                  </div>
                </div>
              </div>
            </div>
          </header>
        </div>
        <main class="page">${content}</main>
        ${designerCredit()}
        <nav class="panel-nav" aria-label="${t("صفحات مربی")}">
          <div class="panel-nav-inner">
            ${renderCoachNav(activeHash)}
          </div>
        </nav>
      </div>`;
  }

  function publicShell(content, { dark = false } = {}) {
    return `<div class="${dark ? "dark-page" : ""}">${content}</div>`;
  }

  function designerCredit({ dark = false } = {}) {
    return `<p class="site-credit${dark ? " is-dark" : ""}">${escapeHtml(t(PLATFORM.designerRole))}: ${escapeHtml(PLATFORM.designer)}</p>`;
  }

  function aiStatusCard() {
    const live = typeof AIRemote !== "undefined" && AIRemote.isEnabled();
    if (live) {
      const local = /localhost|127\.0\.0\.1|\[::1\]/.test(String((window.SJ_CONFIG || {}).aiEndpoint || ""));
      if (!local) {
        return `
        <section class="ai-status ai-status-live" role="status">
          <div class="space-between">
            <strong>هوش مصنوعی واقعی فعال است</strong>
            <span class="badge badge-ok">AvalAI</span>
          </div>
          <p>درخواست‌ها از سایت عمومی به پروکسی می‌روند. کلید API داخل صفحه نیست.</p>
        </section>`;
      }
      return `
        <section class="ai-status ai-status-live" role="status">
          <div class="space-between">
            <strong>هوش مصنوعی واقعی فعال است</strong>
            <span class="badge badge-ok">AvalAI روی همین دستگاه</span>
          </div>
          <p>همین آدرس را باز نگه دار: <span class="num">http://localhost:8777</span></p>
          <p class="muted">اگر پنجره سیاه <span class="num">شروع.bat</span> بسته شود، دوباره نسخه نمایشی می‌شود.</p>
        </section>`;
    }
    return `
      <section class="ai-status ai-status-mock" role="status">
        <div class="space-between">
          <strong>الان نسخه نمایشی است</strong>
          <span class="badge badge-warn">Mock AI</span>
        </div>
        <p>برای AI واقعی فقط از سیستم محلی استفاده کن، نه از لینک گیت‌هاب.</p>
        <ol class="ai-status-steps">
          <li>فایل <span class="num">شروع.bat</span> را در پوشه پروژه دوبار کلیک کن.</li>
          <li>فقط این آدرس را باز کن: <span class="num">http://localhost:8777</span></li>
        </ol>
      </section>`;
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
        ${
          backHash === "@back"
            ? `<button class="btn-quiet" data-action="nav:back">${t("→ بازگشت")}</button>`
            : backHash
              ? `<button class="btn-quiet" data-action="go" data-hash="${backHash}">${t("→ بازگشت")}</button>`
              : ""
        }
        <h1 class="title-xl">${t(title)}</h1>
        ${subtitle ? `<p class="muted">${t(subtitle)}</p>` : ""}
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
    prefSwitch,
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
    designerCredit,
    aiStatusCard,
    COACH_NAV,
  };
})();
