$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")
$tauriConfigPath = Join-Path $root "src-tauri\tauri.conf.json"
$packageJsonPath = Join-Path $root "package.json"
$updateConfigPath = Join-Path $root "update.config.json"

$layoutPath = Join-Path $root "scripts\portable-layout.json"
$layout = Get-Content $layoutPath -Raw -Encoding UTF8 | ConvertFrom-Json

$tauriConfig = Get-Content $tauriConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$packageJson = Get-Content $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$updateConfig = Get-Content $updateConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

$productName = $tauriConfig.productName
$version = $packageJson.version
$safeName = ($productName -replace '[\\/:*?"<>|]', '_')
$packageFolderName = [string]$layout.packageDir
$zipName = [string]$layout.packageZip
if ([string]::IsNullOrWhiteSpace($packageFolderName)) {
  $packageFolderName = $safeName
}
if ([string]::IsNullOrWhiteSpace($zipName)) {
  $zipName = "$packageFolderName.zip"
}
$releaseDir = Join-Path $root "src-tauri\target\release\portable"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "captiolink-vr-portable"
$packageRoot = Join-Path $tempRoot $packageFolderName
$zipPath = Join-Path $releaseDir $zipName
$manifestPath = Join-Path $releaseDir $layout.manifestFile

$launcherSource = Join-Path $root "src-tauri\target\release\portable-launcher.exe"
$applySource = Join-Path $root "src-tauri\target\release\captiolink-vr-apply.exe"
$exeSource = Join-Path $root "src-tauri\target\release\captiolink-vr.exe"
$dllSource = Join-Path $root "src-tauri\target\release\openvr_api.dll"
$noticeSource = Join-Path $root "THIRD_PARTY_NOTICES.md"

Push-Location (Join-Path $root "src-tauri")
try {
  cargo build --release --bin portable-launcher --no-default-features
  cargo build --release --bin captiolink-vr-apply --no-default-features
} finally {
  Pop-Location
}

foreach ($required in @($launcherSource, $applySource, $exeSource, $dllSource, $noticeSource)) {
  if (-not (Test-Path -LiteralPath $required)) {
    throw "Required distribution file was not found: $required"
  }
}

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$resolvedRoot = [System.IO.Path]::GetFullPath($root)
$resolvedReleaseDir = [System.IO.Path]::GetFullPath($releaseDir)
$resolvedTempRoot = [System.IO.Path]::GetFullPath($tempRoot)
$resolvedPackageRoot = [System.IO.Path]::GetFullPath($packageRoot)
if (-not $resolvedReleaseDir.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Portable output directory is outside the workspace: $resolvedReleaseDir"
}
if (-not $resolvedPackageRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Package directory is outside the temp packaging directory: $resolvedPackageRoot"
}

if (Test-Path -LiteralPath $packageRoot) {
  Get-ChildItem -LiteralPath $packageRoot -Recurse -Force | ForEach-Object { $_.Attributes = 'Normal' }
  Remove-Item -LiteralPath $packageRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
  Get-Item -LiteralPath $zipPath | ForEach-Object { $_.Attributes = 'Normal' }
  Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path -LiteralPath $manifestPath) {
  Remove-Item -LiteralPath $manifestPath -Force
}

New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $packageRoot $layout.resourceDir) | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $packageRoot "$($layout.resourceDir)\licenses") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $packageRoot $layout.maintenanceDir) | Out-Null
[System.IO.File]::WriteAllText((Join-Path $packageRoot "$($layout.maintenanceDir)\$($layout.rootMarkerFile)"), "")

Copy-Item -LiteralPath $launcherSource -Destination (Join-Path $packageRoot "${safeName}.exe")
Copy-Item -LiteralPath $applySource -Destination (Join-Path $packageRoot "$($layout.maintenanceDir)\$($layout.applyExe)")
Copy-Item -LiteralPath $exeSource -Destination (Join-Path $packageRoot "$($layout.resourceDir)\$($layout.appExe)")
Copy-Item -LiteralPath $dllSource -Destination (Join-Path $packageRoot "$($layout.resourceDir)\openvr_api.dll")
Copy-Item -LiteralPath $noticeSource -Destination (Join-Path $packageRoot "$($layout.resourceDir)\licenses\THIRD_PARTY_NOTICES.md")

$licensesSource = Join-Path $root "licenses"
$licensesTarget = Join-Path $packageRoot "$($layout.resourceDir)\licenses"
if (Test-Path -LiteralPath $licensesSource) {
  Get-ChildItem -LiteralPath $licensesSource -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $licensesTarget $_.Name) -Force
  }
}

$captionsSource = Join-Path $root "captions"
$captionsTarget = Join-Path $packageRoot "$($layout.resourceDir)\captions"
if (Test-Path -LiteralPath $captionsSource) {
  Copy-Item -LiteralPath $captionsSource -Destination $captionsTarget -Recurse -Force
}

$now = Get-Date
Get-Item -LiteralPath $packageRoot | ForEach-Object { $_.LastWriteTime = $now }
Get-ChildItem -LiteralPath $packageRoot -Recurse -Force | ForEach-Object { $_.LastWriteTime = $now }

Compress-Archive -Path $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal

$owner = [string]$updateConfig.githubOwner
$repo = [string]$updateConfig.githubRepo
if ([string]::IsNullOrWhiteSpace($repo)) {
  $repo = "CaptioLinkVR"
}

$downloadUrl = if ([string]::IsNullOrWhiteSpace($owner)) {
  "https://github.com/OWNER/$repo/releases/download/v$version/$zipName"
} else {
  "https://github.com/$owner/$repo/releases/download/v$version/$zipName"
}

node (Join-Path $root "scripts\generate-manifest.mjs") $zipPath $version $downloadUrl $manifestPath

Write-Output "Portable ZIP created: $zipPath"
Write-Output "Manifest created: $manifestPath"
