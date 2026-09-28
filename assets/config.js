/* تنظیمات عمومی برنامه.

   هوش مصنوعی واقعی فقط روی دستگاه خودتان و فقط با serve.ps1 فعال می‌شود.
   لینک گیت‌هاب، دامنه github.io و هر میزبان دیگر هرگز endpoint نمی‌گیرند
   و برنامه سراغ موتور نمایشی می‌رود؛ اعتبار API خرج نمی‌شود. */

(() => {
  const host = String(window.location.hostname || "").toLowerCase();
  const protocol = String(window.location.protocol || "");
  const hostedOnGitHub =
    host.endsWith(".github.io") || host === "github.io" || host === "github.com" || host.endsWith(".githubusercontent.com");
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  const isLocalHttp = (protocol === "http:" || protocol === "https:") && isLoopback && !hostedOnGitHub;

  window.SJ_CONFIG = {
    /* فقط پروکسی همین دستگاه. روی گیت‌هاب همیشه خالی می‌ماند. */
    aiEndpoint: isLocalHttp ? window.location.origin : "",
    aiTimeoutMs: 60000,
  };
})();
