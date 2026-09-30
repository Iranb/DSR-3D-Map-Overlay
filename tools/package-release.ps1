param([ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$')][string]$Version = '1.0.0')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$releaseName = "DSR-3D-Map-Overlay-v$Version-win-x64"
$artifactRoot = Join-Path $projectRoot 'artifacts'
$releaseRoot = Join-Path $artifactRoot $releaseName
$archivePath = Join-Path $artifactRoot "$releaseName.zip"
if ((Test-Path -LiteralPath $releaseRoot) -or (Test-Path -LiteralPath $archivePath)) {
    throw 'This version already has build output; choose another version or archive the old output first.'
}
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
dotnet publish (Join-Path $projectRoot 'overlay-app/DSRMapOverlay.csproj') -c Release -r win-x64 --self-contained true -p:DebugType=None -o (Join-Path $releaseRoot 'publish')
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed.' }
foreach ($file in @('README.md','使用说明.md','功能对齐检查.md','LICENSE.md','THIRD_PARTY_NOTICES.md','启动悬浮地图.bat','预览悬浮地图.bat')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $releaseRoot
}
if (Test-Path -LiteralPath (Join-Path $projectRoot 'licenses')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot 'licenses') -Destination $releaseRoot -Recurse
}
$packageCache = if ($env:NUGET_PACKAGES) { $env:NUGET_PACKAGES } else { Join-Path $env:USERPROFILE '.nuget/packages' }
$dependencies = Get-Content -LiteralPath (Join-Path $releaseRoot 'publish/DSRMapOverlay.deps.json') -Raw | ConvertFrom-Json
foreach ($library in $dependencies.libraries.PSObject.Properties.Name) {
    if ($library -match '^runtimepack\.(?<Package>Microsoft\.[^/]+)/(?<Version>[^/]+)$') {
        $packageName = $Matches.Package
        $packageDirectory = Join-Path $packageCache ($packageName.ToLowerInvariant() + '/' + $Matches.Version)
        $runtimeNotices = @(Get-ChildItem -LiteralPath $packageDirectory -File | Where-Object { $_.Name -match '(?i)license|third.party|notice' })
        if (-not $runtimeNotices.Count) { throw "Runtime notices missing: $packageDirectory" }
        foreach ($notice in $runtimeNotices) {
            Copy-Item -LiteralPath $notice.FullName -Destination (Join-Path $releaseRoot "licenses/$packageName-$($notice.Name)")
        }
    }
}
Compress-Archive -LiteralPath $releaseRoot -DestinationPath $archivePath -CompressionLevel Optimal
$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$archivePath.sha256", "$archiveHash  $releaseName.zip`n")
Write-Output "Release archive: $archivePath"
Write-Output "SHA256: $archiveHash"
