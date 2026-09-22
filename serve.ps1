# سرور محلی ساده برای اجرای اپ در مرورگر.
# اجرا: در PowerShell دستور  .\serve.ps1  را بزنید و بعد آدرس http://localhost:8777 را باز کنید.

param(
  [int]$Port = 8777
)

$root = $PSScriptRoot
$prefix = "http://localhost:$Port/"

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

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Swim Jahani روی $prefix اجرا شد. برای توقف Ctrl+C بزنید."

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.LocalPath.TrimStart('/')
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
