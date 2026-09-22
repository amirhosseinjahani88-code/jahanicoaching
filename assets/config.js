/* تنظیمات عمومی برنامه.

   هوش مصنوعی واقعی فقط وقتی فعال می‌شود که برنامه از روی localhost اجرا شده باشد،
   یعنی با serve.ps1 روی دستگاه خودتان. روی نسخه منتشرشده در GitHub Pages
   مقدار aiEndpoint خالی می‌ماند و برنامه سراغ موتور محلی می‌رود؛
   بنابراین هیچ بازدیدکننده‌ای نمی‌تواند از اعتبار API استفاده کند. */

(() => {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";

  window.SJ_CONFIG = {
    /* روی حالت محلی، پروکسی همان سروری است که صفحه را سرو کرده است. */
    aiEndpoint: isLocal ? window.location.origin : "",
    aiTimeoutMs: 60000,
  };
})();
