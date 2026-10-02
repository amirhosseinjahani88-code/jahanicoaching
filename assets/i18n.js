/* زبان و پوسته. انتخاب در همین مرورگر می‌ماند. */

const Prefs = (() => {
  const KEY = "swim-jahani.prefs";
  const prefs = { lang: "fa", theme: "dark" };

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (saved.lang === "en" || saved.lang === "fa") prefs.lang = saved.lang;
    if (saved.theme === "light" || saved.theme === "dark") prefs.theme = saved.theme;
  } catch (_) {
    /* تنظیم ذخیره‌نشده را نادیده می‌گیریم */
  }

  function apply() {
    const root = document.documentElement;
    const english = prefs.lang === "en";
    root.lang = english ? "en" : "fa";
    root.dir = english ? "ltr" : "rtl";
    root.dataset.theme = prefs.theme;
    document.title = english ? "Jahani Coaching" : "کوچینگ جهانی | jahanicoaching";
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch (_) {
      /* مرور خصوصی */
    }
    apply();
  }

  apply();

  return {
    get: () => prefs,
    setLang(lang) {
      prefs.lang = lang === "en" ? "en" : "fa";
      save();
    },
    setTheme(theme) {
      prefs.theme = theme === "light" ? "light" : "dark";
      save();
    },
  };
})();

const I18N = {
  "تعرفه‌ها": "Pricing",
  "ورود": "Log in",
  "شروع": "Start",
  "ثبت‌نام": "Sign up",
  "خروج": "Log out",
  "→ بازگشت": "← Back",
  "ورود مدیر": "Admin",
  "جزئیات پلن‌ها": "Plan details",
  "پلن شما": "Your plan",
  "پیشنهادی": "Recommended",
  "ذخیره": "Save",
  "ساخت جلسه": "Build session",
  "در حال ساخت…": "Building…",
  "نمونه دیگر": "Another sample",
  "درخواست تمرین": "Workout request",
  "مثلاً: جلسه سرعت کرال سینه": "e.g. a freestyle speed session",
  "یک جمله، یک جلسه.": "One sentence. One session.",
  "چه کار می‌کند": "What it does",
  "مشکل مربی": "The coach's problem",
  "مربیگری شنا، بدون کاغذ.": "Swim coaching, without paper.",
  "تمرین، تحلیل و شهریه در یک جا.": "Workouts, analysis, and fees in one place.",
  "مربیگری شنا، در یک جا.": "Swim coaching, in one place.",
  "دو اشتراک سالانه برای مربی شنا.": "Two yearly plans for a swim coach.",
  "برای استخر و آکادمی": "For pools and academies",
  "حساب ندارید؟ ثبت‌نام": "No account? Sign up",
  "قبلاً ثبت‌نام کرده‌اید؟ ورود": "Already registered? Log in",
  "شماره همراه": "Mobile number",
  "رمز عبور": "Password",
  "نام": "First name",
  "نام خانوادگی": "Last name",
  "تکرار رمز": "Confirm password",
  "سبد خرید": "Cart",
  "این پرداخت فرضی است و هیچ پول واقعی کم نمی‌شود.": "This payment is simulated. No real money is charged.",
  "سفارش شما": "Your order",
  "پرداخت فرضی": "Simulated payment",
  "اشتراک یک‌ساله": "Yearly subscription",
  "مبلغ قابل پرداخت": "Amount due",
  "تأیید خرید": "Confirm purchase",
  "تکمیل خرید": "Complete purchase",
  "قوانین استفاده را می‌پذیرم.": "I accept the terms of use.",
  "طراح کل سامانه": "Product designer",
  "کاکپیت": "Cockpit",
  "باشگاه": "Club",
  "شاگردان": "Swimmers",
  "حضور و غیاب": "Attendance",
  "جلسات": "Sessions",
  "تمرین": "Training",
  "تمرین‌نویسی": "Workout builder",
  "آنالیز بیومکانیک": "Biomechanics",
  "آرشیو متدولوژی": "Methodology vault",
  "مالی": "Finance",
  "حساب من": "Account",
  "مستری پرو": "Mastery Pro",
  "اقتصادی": "Economy",
  "هوش تجاری": "Business intelligence",
  "دایرکتوری مربیان": "Coach directory",
  "CMS متدولوژی": "Methodology CMS",
  "پلن اقتصادی": "Economy plan",
  "پلن مستری پرو": "Mastery Pro plan",
  "مربیان تازه‌کار و مدارس شنای مبتدی": "New coaches and beginner swim schools",
  "مربیان ارشد، رقابتی و تیم‌ساز": "Senior, competitive, and team-building coaches",
  "۵٫۰۰۰٫۰۰۰ تومان / سالانه": "5,000,000 toman / year",
  "۲۰٫۰۰۰٫۰۰۰ تومان / سالانه": "20,000,000 toman / year",
  "پیشنهاد اساتید": "Faculty pick",
  "زیرساخت دیجیتال مربیگری و تحلیل بیومکانیک شنا": "Digital infrastructure for swim coaching and biomechanics",
  "یک جمله بگویید. جلسه آماده است.": "Say one sentence. The session is ready.",
  "ریت، DPS و FINA روی نمودار.": "Rate, DPS, and FINA on a chart.",
  "اولیا پیشرفت و شهریه را می‌بینند.": "Parents see progress and fees.",
  "تمرین‌نویسی سریع با ویس": "Fast workout writing by voice",
  "آنالیز عددی بیومکانیک": "Numeric biomechanics",
  "شفافیت مالی و فنی با اولیا": "Clear fees and technique for parents",
  "برنامه هنوز روی کاغذ نوشته می‌شود.": "Programs are still written on paper.",
  "سنجش فنی هنوز حسی است.": "Technique is still judged by feel.",
  "شهریه در پیام‌ها گم می‌شود.": "Fees get lost in messages.",
  "اولیا پیشرفت را نمی‌بینند.": "Parents cannot see progress.",
  "تمرین با ویس": "Voice workouts",
  "نمودار ریت و FINA": "Rate and FINA charts",
  "رسید وصل به پرونده": "Receipts linked to the file",
  "پورتال اولیا": "Parent portal",
  "تمرین‌نویسی وقت‌گیر و تکراری": "Slow, repetitive workout writing",
  "نبود ابزار علمی سنجش بیومکانیک": "No scientific biomechanics tool",
  "نشتی مالی و فراموشی شهریه‌ها": "Fee leaks and forgotten payments",
  "بی‌خبری والدین و ریزش شاگردان": "Uninformed parents and drop-off",
  "کاهش زمان اداری مربی": "less admin time for the coach",
  "افزایش درآمد با حفظ شناگر": "more revenue by keeping swimmers",
  "تا ساخت اولین جلسه تمرین": "to the first workout",
  "۸۰٪": "80%",
  "۴۰٪": "40%",
  "۳ دقیقه": "3 min",
  "مدیریت شاگردان و پرونده پایه": "Swimmer files and basic records",
  "طراح تمرین دستی با محاسبه خودکار متراژ": "Manual workout builder with automatic distance",
  "حضور و غیاب روزانه": "Daily attendance",
  "کارنامه متنی اولیا (پیش‌نمایش)": "Text parent report (preview)",
  "تمرین‌نویسی هوشمند با متن و ویس": "Smart workouts from text and voice",
  "آنالیز بیومکانیک، ریت دست و امتیاز FINA": "Biomechanics, stroke rate, and FINA score",
  "دستیار مالی و اسکن OCR رسید": "Finance assistant and receipt OCR",
  "آرشیو متدولوژی جهانی": "Global methodology vault",
  "پورتال زنده اولیا": "Live parent portal",
  "کاکپیت مربی با هوش عملیاتی روز": "Coach cockpit with daily insights",
  "پروفایل ۳۶۰ درجه شناگر": "360° swimmer profile",
  "دروازه بازبینی AI پیش از انتشار": "AI review before publishing",
  "آنالیز ریت دست، DPS و امتیاز FINA": "Stroke rate, DPS, and FINA score",
  "آرشیو متدولوژی و طرح‌درس سنین پایه": "Methodology vault and age-group lesson plans",
  "پورتال مستقل اولیا با لینک اختصاصی": "Parent portal with a private link",
  "لایسنس آکادمی‌ها و استخرها": "Academy and pool license",
  "سفارشی (قراردادی)": "Custom contract",
  "چند کاربره، گزارش مدیریتی جامع، دسترسی همزمان مربیان": "Multi-user, management reports, shared coach access",
  "محتوای متدولوژی ویژه (Vault)": "Special methodology content (Vault)",
  "فروش مجزای دوره و جزوه": "Courses and notes sold separately",
  "وبینار، طرح‌درس سنین پایه و ویدیوهای تحلیلی": "Webinars, age-group plans, and analysis videos",
  "صفحات مربی": "Coach pages",
  "صفحات مدیریت": "Admin pages",
  "ناوبری سایت": "Site",
  "روشن": "Light",
  "تیره": "Dark",
};

function t(text) {
  const value = String(text ?? "");
  if (Prefs.get().lang !== "en") return value;
  return Object.prototype.hasOwnProperty.call(I18N, value) ? I18N[value] : value;
}
