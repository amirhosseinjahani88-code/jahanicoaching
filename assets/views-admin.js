/* پنل مستر کنترل: داشبورد هوش تجاری، دایرکتوری مربیان و CMS متدولوژی. */

const AdminViews = (() => {
  function shell(active, content) {
    const tabs = [
      { hash: "#/admin", label: "هوش تجاری" },
      { hash: "#/admin/coaches", label: "دایرکتوری مربیان" },
      { hash: "#/admin/cms", label: "CMS متدولوژی" },
    ];
    return `
      <header class="topbar topbar-admin">
        <div class="topbar-inner">
          <div class="brand" style="color:#fff">
            <span class="brand-mark" style="background:#fff;color:#0b192c">⚙️</span>
            <span>${PLATFORM.name}</span>
          </div>
          <nav class="nav nav-dark" aria-label="صفحات مدیریت">
            ${tabs
              .map(
                (t) => `<button data-action="go" data-hash="${t.hash}" ${active === t.hash ? 'aria-current="page"' : ""}>${t.label}</button>`
              )
              .join("")}
          </nav>
          <div class="topbar-actions">
            <button class="btn-quiet" style="color:#cbd5e1" data-action="auth:logout">خروج</button>
          </div>
          <button class="nav-toggle nav-toggle-dark" data-action="nav:toggle" aria-expanded="false" aria-label="باز کردن منو">☰</button>
        </div>
      </header>
      <main class="page">${content}</main>
      ${UI.designerCredit()}`;
  }

  function metrics() {
    const essential = COACHES.filter((c) => c.plan === "essential");
    const pro = COACHES.filter((c) => c.plan === "pro");
    const arr = essential.length * PLANS.essential.priceToman + pro.length * PLANS.pro.priceToman;
    const students = COACHES.reduce((sum, c) => sum + c.students, 0);
    const atRisk = COACHES.filter((c) => c.risk !== "low");
    return { essential, pro, arr, students, atRisk };
  }

  function bi() {
    const m = metrics();
    const targetProgress = Math.round((m.arr / BUSINESS_TARGETS.totalRevenue) * 100);

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("داشبورد هوش تجاری", "وضعیت درآمد، رشد مربیان و ریسک ریزش.")}

        <div class="grid">
          ${UI.kpi("درآمد سالانه قراردادی", UI.millions(m.arr), `هدف سال اول: ${UI.millions(BUSINESS_TARGETS.totalRevenue)}`)}
          ${UI.kpi("مربیان فعال", UI.fa(COACHES.length), `${UI.fa(m.pro.length)} پرو / ${UI.fa(m.essential.length)} اقتصادی`)}
          ${UI.kpi("شناگران زیر پوشش", UI.fa(m.students), "در همه باشگاه‌ها")}
          ${UI.kpi("ریسک ریزش", UI.fa(m.atRisk.length), "مربی با فعالیت کم", m.atRisk.length ? "kpi-warn" : "")}
        </div>

        <section class="card stack">
          <h2 class="title-md">پیشرفت نسبت به هدف درآمدی سال اول</h2>
          ${UI.progressBar(targetProgress, `${UI.millions(m.arr)} از ${UI.millions(BUSINESS_TARGETS.totalRevenue)}`)}
          <div class="grid">
            ${UI.kpi("هدف اقتصادی", `${UI.fa(BUSINESS_TARGETS.essentialCoaches)} مربی`, UI.millions(BUSINESS_TARGETS.essentialRevenue))}
            ${UI.kpi("هدف مستری پرو", `${UI.fa(BUSINESS_TARGETS.proCoaches)} مربی`, UI.millions(BUSINESS_TARGETS.proRevenue))}
            ${UI.kpi("فروش متدولوژی", UI.millions(BUSINESS_TARGETS.vaultRevenue), "وبینار و طرح‌درس")}
            ${UI.kpi("حاشیه سود ناخالص", `${UI.fa(BUSINESS_TARGETS.grossMargin)}٪`, `هزینه زیرساخت ${UI.millions(BUSINESS_TARGETS.infraCost)}`)}
          </div>
        </section>

        <section class="card stack">
          <h2 class="title-md">ثبت‌نام ماهانه مربیان</h2>
          ${UI.barChart({
            labels: SIGNUPS_BY_MONTH.map((r) => r.month),
            series: [
              { name: "اقتصادی", color: "#0a84ff", values: SIGNUPS_BY_MONTH.map((r) => r.essential) },
              { name: "مستری پرو", color: "#00d2ff", values: SIGNUPS_BY_MONTH.map((r) => r.pro) },
            ],
          })}
        </section>

        <section class="card stack">
          <h2 class="title-md">ترکیب جریان‌های درآمدی</h2>
          <div class="stack">
            ${REVENUE_STREAMS.map(
              (s) => `
              <div class="ledger-row">
                <strong>${UI.escapeHtml(s.title)}</strong>
                <span class="muted">${UI.escapeHtml(s.audience)}</span>
                <span class="badge badge-blue">${UI.escapeHtml(s.price)}</span>
              </div>`
            ).join("")}
          </div>
        </section>
      </div>`;

    return shell("#/admin", body);
  }

  function coaches() {
    const riskLabel = { low: "پایدار", medium: "نیازمند پیگیری", high: "ریسک بالا" };
    const rows = COACHES.map(
      (c) => `
      <div class="ledger-row coach-row">
        <span class="row" style="gap:.6rem">
          <span class="avatar">${UI.escapeHtml(UI.initials(c.name))}</span>
          <span class="stack" style="gap:.1rem">
            <strong>${UI.escapeHtml(c.name)}</strong>
            <span class="muted" style="font-size:.88rem">${UI.escapeHtml(c.city)} • ${UI.escapeHtml(c.pool)}</span>
          </span>
        </span>
        <span class="badge ${c.plan === "pro" ? "badge-blue" : "badge-warn"}">${c.plan === "pro" ? "مستری پرو" : "اقتصادی"}</span>
        <span class="num">${UI.fa(c.students)} شاگرد</span>
        <span class="muted">${UI.escapeHtml(c.lastActive)}</span>
        <span class="badge ${c.risk === "low" ? "badge-ok" : "badge-warn"}">${riskLabel[c.risk]}</span>
        <button class="btn-white btn-sm" data-action="admin:ghost" data-id="${c.id}">ورود به حساب</button>
      </div>`
    ).join("");

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("دایرکتوری مربیان", "با Ghost Login می‌توانید دقیقاً همان چیزی را ببینید که مربی می‌بیند.")}
        <section class="card stack">${rows}</section>
        <p class="muted">ورود مدیریتی برای پشتیبانی است؛ در نسخه واقعی هر ورود در لاگ ثبت و به مربی اطلاع داده می‌شود.</p>
      </div>`;

    return shell("#/admin/coaches", body);
  }

  function cms() {
    const modules = SJ.vaultModules();
    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("CMS متدولوژی", "مدیریت ماژول‌ها، دوره‌ها و قیمت محتوای Vault.")}

        <section class="card stack">
          <h2 class="title-md">افزودن محتوای تازه</h2>
          <div class="manual-form">
            <label class="field"><span>عنوان</span><input id="cms-title" placeholder="مثلاً وبینار تحلیل استارت" /></label>
            <label class="field"><span>نوع</span><input id="cms-kind" value="وبینار" /></label>
            <label class="field"><span>قیمت (تومان)</span><input id="cms-price" value="1500000" inputmode="numeric" /></label>
            <button class="btn-primary" data-action="cms:add">افزودن</button>
          </div>
        </section>

        <div class="grid">
          ${modules
            .map(
              (m) => `
            <div class="card stack">
              <div class="module-art" style="background:${m.art}">${m.icon}</div>
              <div class="space-between">
                <strong class="title-md">${UI.escapeHtml(m.title)}</strong>
                <span class="badge ${m.published ? "badge-ok" : "badge-warn"}">${m.published ? "منتشر شده" : "پیش‌نویس"}</span>
              </div>
              <span class="badge badge-blue">${UI.escapeHtml(m.kind)} • ${m.priceToman ? UI.millions(m.priceToman) : "رایگان در پلن پرو"}</span>
              <p class="muted" style="font-size:.93rem">${UI.escapeHtml(m.summary || "توضیحی ثبت نشده است.")}</p>
              <span class="muted" style="font-size:.9rem">${UI.fa(m.lessons.length)} درس</span>
              <div class="row">
                <button class="btn-white btn-sm" data-action="cms:toggle" data-id="${m.id}">${m.published ? "لغو انتشار" : "انتشار"}</button>
                <button class="btn-quiet" data-action="vault:open" data-id="${m.id}">مشاهده درس‌ها</button>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;

    return shell("#/admin/cms", body);
  }

  return { bi, coaches, cms };
})();
