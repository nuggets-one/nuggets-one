# Pull production env vars from Vercel into .env.local for local development.
# Run this yourself in PowerShell (Cursor agent cannot decrypt Vercel "Sensitive" secrets).
#
# Prerequisites: already logged in via `npx vercel login` (done) and project linked.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Pulling production env from Vercel project nuggets-one..."
npx vercel env pull .env.local --environment=production --yes

# Local overrides
$content = Get-Content .env.local -Raw
$content = $content -replace '(?m)^NEXT_PUBLIC_SITE_URL=.*$', 'NEXT_PUBLIC_SITE_URL="http://localhost:3010"'

if ($content -notmatch '(?m)^CAPACITOR_SERVER_URL=') {
  $content = $content.TrimEnd() + "`r`nCAPACITOR_SERVER_URL=`"https://nuggets.one`"`r`n"
}
if ($content -notmatch '(?m)^NEXT_PUBLIC_SEARCH_GLOBAL=') {
  $content = $content.TrimEnd() + "`r`nNEXT_PUBLIC_SEARCH_GLOBAL=1`r`n"
}

# Map Firebase legacy keys to NEXT_PUBLIC_* if present
function Get-EnvValue([string]$text, [string]$key) {
  if ($text -match "(?m)^$key=`"([^`"]*)`"") { return $Matches[1] }
  if ($text -match "(?m)^$key=([^\r\n]+)") { return $Matches[1].Trim('"') }
  return $null
}

$apiKey = Get-EnvValue $content 'apiKey'
$authDomain = Get-EnvValue $content 'authDomain'
$projectId = Get-EnvValue $content 'projectId'
$messagingSenderId = Get-EnvValue $content 'messagingSenderId'
$appId = Get-EnvValue $content 'appId'

$extras = @()
if ($apiKey -and $content -notmatch '(?m)^NEXT_PUBLIC_FIREBASE_API_KEY=') {
  $extras += "NEXT_PUBLIC_FIREBASE_API_KEY=`"$apiKey`""
}
if ($authDomain -and $content -notmatch '(?m)^NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=') {
  $extras += "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=`"$authDomain`""
}
if ($projectId -and $content -notmatch '(?m)^NEXT_PUBLIC_FIREBASE_PROJECT_ID=') {
  $extras += "NEXT_PUBLIC_FIREBASE_PROJECT_ID=`"$projectId`""
}
if ($messagingSenderId -and $content -notmatch '(?m)^NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=') {
  $extras += "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=`"$messagingSenderId`""
}
if ($appId -and $content -notmatch '(?m)^NEXT_PUBLIC_FIREBASE_APP_ID=') {
  $extras += "NEXT_PUBLIC_FIREBASE_APP_ID=`"$appId`""
}

if ($extras.Count -gt 0) {
  $content = $content.TrimEnd() + "`r`n`r`n# Canonical Firebase public names`r`n" + ($extras -join "`r`n") + "`r`n"
}

Set-Content -Path .env.local -Value $content -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "Done. .env.local updated with production secrets + localhost site URL."
Write-Host "Verify with: npm run env:verify   (or your project's env check script)"
