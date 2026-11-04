$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildRoot = Join-Path $sourceRoot '.output/chrome-mv3'
$outputRoot = Join-Path $sourceRoot '.output/releases'

Push-Location $sourceRoot
try {
  & node scripts/verify-beta.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Release verification failed.' }
} finally { Pop-Location }

$manifest = Get-Content -LiteralPath (Join-Path $buildRoot 'manifest.json') -Raw | ConvertFrom-Json
if ($manifest.version -notmatch '^\d+\.\d+\.\d+(\.\d+)?$') { throw 'Invalid release version.' }
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$zipPath = Join-Path $outputRoot "keepitreel-$($manifest.version)-chrome.zip"
Compress-Archive -Path (Join-Path $buildRoot '*') -DestinationPath $zipPath -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  if (-not $archive.GetEntry('manifest.json')) { throw 'Missing manifest at archive root.' }
  if ($archive.Entries.FullName | Where-Object { $_ -match '(^|/)(node_modules|\.env|\.git)(/|$)' }) { throw 'Unexpected archive contents.' }
  Write-Output "Verified archive: $($archive.Entries.Count) entries."
} finally { $archive.Dispose() }

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([IO.Path]::GetFileName($zipPath))" | Set-Content -LiteralPath "$zipPath.sha256" -Encoding ascii
Get-Item -LiteralPath $zipPath | Select-Object FullName, Length
