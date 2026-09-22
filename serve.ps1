# سرور محلی «شنا جهانی» + پروکسی هوش مصنوعی.
# اجرا: در PowerShell دستور  .\serve.ps1  را بزنید و بعد آدرس http://localhost:8777 را باز کنید.
#
# کلید هوش مصنوعی از فایل ai-key.local.txt (خارج از گیت) یا متغیر محیطی AVALAI_API_KEY خوانده می‌شود.
# این سرور فقط روی localhost گوش می‌دهد، پس از اینترنت قابل دسترسی نیست و کلید شما جای دیگری نمی‌رود.

param(
  [int]$Port = 8777,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$prefix = "http://localhost:$Port/"

$keyFile = Join-Path $root "ai-key.local.txt"
$apiKey = $env:AVALAI_API_KEY
if (-not $apiKey -and (Test-Path $keyFile)) {
  $apiKey = (Get-Content $keyFile -Raw).Trim()
}
$baseUrl = if ($env:AVALAI_BASE_URL) { $env:AVALAI_BASE_URL } else { "https://api.avalai.ir/v1" }
$model = if ($env:AI_MODEL) { $env:AI_MODEL } else { "gemini-2.5-flash" }

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".ico"  = "image/x-icon"
}

$systemPrompt = @'
تو یک مربی ارشد شنا با دانش متدولوژی World Aquatics هستی و برای یک پلتفرم فارسی‌زبان جلسه تمرین طراحی می‌کنی.

از توضیح فارسی مربی، یک جلسه تمرین اصولی بساز و فقط و فقط یک آبجکت JSON برگردان، بدون هیچ متن اضافه و بدون بلوک کد.

ساختار خروجی دقیقاً این است:
{
  "title": "عنوان کوتاه فارسی جلسه",
  "group": "رده سنی مثل نوجوانان",
  "level": "یکی از: مبتدی، متوسط، پیشرفته، رقابتی",
  "stroke": "یکی از: کرال سینه، قورباغه، پروانه، کرال پشت",
  "focus": "یکی از: استقامت، سرعت، تکنیک، آستانه، استارت",
  "minutes": عدد دقیقه جلسه,
  "poolLength": 25 یا 50,
  "rateTarget": عدد ریت هدف دست‌کشی در دقیقه,
  "coachTip": "یک توصیه کاربردی مربیگری در حد دو جمله",
  "sets": [
    { "phase": "نام بخش", "detail": "شرح تکرارها با متراژ و استراحت", "meters": متراژ عددی این بخش, "note": "نکته فنی کوتاه" }
  ]
}

قواعد الزامی:
- بین ۴ تا ۶ بخش بساز و ترتیب منطقی را حفظ کن: گرم‌کردن، تکنیک، ست اصلی، ست پا، سردکردن.
- «meters» باید عدد صحیح و مضربی از ۲۵ باشد و با شرح تکرارها بخواند؛ مجموع متراژ باید با سطح و مدت جلسه بخواند (مبتدی حدود ۱۸، متوسط ۳۰، پیشرفته ۴۲ و رقابتی ۵۲ متر در هر دقیقه).
- اعداد داخل «detail» را با رقم فارسی بنویس، ولی مقادیر عددی JSON مثل meters و minutes را با رقم انگلیسی بده.
- نکات فنی باید مشخص و قابل اجرا لب استخر باشند، نه کلی‌گویی.
'@

function Write-Json($context, $object, [int]$status = 200) {
  $json = $object | ConvertTo-Json -Depth 12 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $context.Response.StatusCode = $status
  $context.Response.ContentType = "application/json; charset=utf-8"
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Invoke-AvalAI([string]$brief) {
  $payload = @{
    model       = $model
    temperature = 0.6
    max_tokens  = 1600
    messages    = @(
      @{ role = "system"; content = $systemPrompt },
      @{ role = "user"; content = $brief }
    )
  } | ConvertTo-Json -Depth 8

  $response = Invoke-WebRequest -Uri "$baseUrl/chat/completions" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $apiKey" } `
    -ContentType "application/json; charset=utf-8" `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) `
    -TimeoutSec 60 `
    -UseBasicParsing

  $text = [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())
  return $text | ConvertFrom-Json
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host ""
Write-Host "  Swim Jahani روی $prefix اجرا شد."
Write-Host "  برای خاموش کردن، این پنجره را ببندید یا Ctrl+C بزنید."
Write-Host ""
if ($apiKey) {
  Write-Host "هوش مصنوعی واقعی فعال است (مدل $model). کلید فقط روی همین دستگاه است." -ForegroundColor Green
} else {
  Write-Host "کلید پیدا نشد؛ برنامه با موتور محلی کار می‌کند. کلید را در ai-key.local.txt بگذارید." -ForegroundColor Yellow
}

# مرورگر را خودکار روی همان آدرس باز می‌کند تا دنبال آدرس نگردید.
if (-not $NoBrowser) {
  Start-Process $prefix | Out-Null
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $path = $request.Url.LocalPath.TrimStart('/')

    # ---------- پروکسی هوش مصنوعی ----------
    if ($request.Url.LocalPath -eq "/api/workout") {
      if ($request.HttpMethod -ne "POST") {
        Write-Json $context @{ error = "method_not_allowed" } 405
        $context.Response.OutputStream.Close()
        continue
      }
      if (-not $apiKey) {
        Write-Json $context @{ error = "no_key"; message = "کلید هوش مصنوعی روی این دستگاه تنظیم نشده است." } 503
        $context.Response.OutputStream.Close()
        continue
      }

      try {
        $reader = [System.IO.StreamReader]::new($request.InputStream, [System.Text.Encoding]::UTF8)
        $bodyText = $reader.ReadToEnd()
        $reader.Close()
        $brief = ([string](($bodyText | ConvertFrom-Json).brief)).Trim()

        if ($brief.Length -lt 3) {
          Write-Json $context @{ error = "bad_request"; message = "توضیح تمرین خیلی کوتاه است." } 400
        } else {
          if ($brief.Length -gt 400) { $brief = $brief.Substring(0, 400) }
          Write-Host "  → درخواست تمرین: $brief" -ForegroundColor Cyan
          $result = Invoke-AvalAI $brief
          $content = $result.choices[0].message.content
          Write-Json $context @{ content = $content; model = $result.model }
          Write-Host "  ← پاسخ مدل دریافت شد." -ForegroundColor Green
        }
      } catch {
        Write-Host "  ! خطا در تماس با سرویس: $($_.Exception.Message)" -ForegroundColor Red
        Write-Json $context @{ error = "upstream"; message = $_.Exception.Message } 502
      }

      $context.Response.OutputStream.Close()
      continue
    }

    # ---------- فایل‌های ایستا ----------
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
    $file = Join-Path $root $path

    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $context.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $context.Response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
  $listener.Dispose()
}
