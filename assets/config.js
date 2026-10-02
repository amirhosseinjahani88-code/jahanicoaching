/* تنظیمات عمومی برنامه.

   کلید AvalAI هیچ‌وقت داخل این فایل نیست.
   روی localhost پروکسی serve.ps1 است.
   روی گیت‌هاب، مرورگر فقط پروکسی Cloudflare را صدا می‌زند. */

(() => {
  const PUBLIC_AI_ENDPOINT = "https://swim-jahani-ai.swim-jahani-ai-worker.workers.dev";
  const host = String(window.location.hostname || "").toLowerCase();
  const protocol = String(window.location.protocol || "");
  const hostedOnGitHub =
    host.endsWith(".github.io") || host === "github.io" || host === "github.com" || host.endsWith(".githubusercontent.com");
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  const isLocalHttp = (protocol === "http:" || protocol === "https:") && isLoopback && !hostedOnGitHub;

  window.SJ_CONFIG = {
    aiEndpoint: isLocalHttp ? window.location.origin : hostedOnGitHub && PUBLIC_AI_ENDPOINT ? PUBLIC_AI_ENDPOINT : "",
    aiTimeoutMs: 60000,
  };
})();
