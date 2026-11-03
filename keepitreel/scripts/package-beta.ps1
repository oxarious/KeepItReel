$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputRoot = [IO.Path]::GetFullPath((Join-Path $sourceRoot '..'))
$buildRoot = Join-Path $sourceRoot '.output\chrome-mv3'
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $outputRoot 'keepitreel-extension'))
# Verify the exact resolved sibling output target before any recursive deletion.
if ([IO.Path]::GetDirectoryName($releaseRoot) -ne $outputRoot -or [IO.Path]::GetFileName($releaseRoot) -ne 'keepitreel-extension' -or $releaseRoot -eq $sourceRoot) { throw 'Unexpected release path' }
Push-Location $sourceRoot
try { & node scripts/verify-beta.mjs; if ($LASTEXITCODE -ne 0) { throw 'Beta verification failed' } } finally { Pop-Location }
if (Test-Path -LiteralPath $releaseRoot) {
  if ((Get-Item -LiteralPath $releaseRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Release target cannot be a link' }
  if (-not (Test-Path -LiteralPath (Join-Path $releaseRoot 'manifest.json'))) { throw 'Refusing to replace an unrecognised folder' }
  Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}
Copy-Item -LiteralPath $buildRoot -Destination $releaseRoot -Recurse
$extensionZip = Join-Path $outputRoot 'keepitreel-extension.zip'
Compress-Archive -Path (Join-Path $releaseRoot '*') -DestinationPath $extensionZip -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceZip = Join-Path $outputRoot 'keepitreel-source.zip'
if (Test-Path -LiteralPath $sourceZip) { Remove-Item -LiteralPath $sourceZip -Force }
$archive = [IO.Compression.ZipFile]::Open($sourceZip, [IO.Compression.ZipArchiveMode]::Create)
$excluded = @('node_modules', '.output', '.wxt', '.git', 'test-results', 'playwright-report')
$files = [Collections.Generic.List[string]]::new()
function Add-SourceFiles([string]$directory) {
  foreach ($item in Get-ChildItem -LiteralPath $directory -Force) {
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
    if ($item.PSIsContainer) { if ($excluded -notcontains $item.Name) { Add-SourceFiles $item.FullName } }
    elseif ($item.Name -notlike '.env*' -or $item.Name -eq '.env.example') { $files.Add($item.FullName) }
  }
}
try {
  Add-SourceFiles $sourceRoot
  foreach ($file in $files) {
    if (-not $file.StartsWith($sourceRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Source escaped project directory' }
    $relative = $file.Substring($sourceRoot.Length + 1).Replace('\', '/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file, $relative, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $archive.Dispose() }
foreach ($zip in @($extensionZip, $sourceZip)) {
  $check = [IO.Compression.ZipFile]::OpenRead($zip)
  try {
    if ($check.Entries.FullName -contains '.env' -or ($check.Entries.FullName | Where-Object { $_ -like 'node_modules/*' })) { throw 'Unexpected archive contents' }
    if ($zip -eq $extensionZip -and -not $check.GetEntry('manifest.json')) { throw 'Missing root manifest' }
    Write-Output "$([IO.Path]::GetFileName($zip)): $($check.Entries.Count) entries"
  } finally { $check.Dispose() }
}
$hashes = Get-FileHash -LiteralPath $extensionZip, $sourceZip -Algorithm SHA256
$hashes | ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } | Set-Content -LiteralPath (Join-Path $outputRoot 'SHA256SUMS.txt') -Encoding ascii
Get-Item -LiteralPath $extensionZip, $sourceZip | Select-Object Name, Length
