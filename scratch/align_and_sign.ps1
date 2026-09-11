$ErrorActionPreference = "Stop"

$buildTools = "C:\Users\Tushar.Dayma\AppData\Local\Android\Sdk\build-tools\35.0.0"
$apksigner  = Join-Path $buildTools "apksigner.bat"
$zipalign   = Join-Path $buildTools "zipalign.exe"
$keystore   = "D:\delivery_tracking_system\driver_app\android\app\debug.keystore"
$srcApk     = "D:\delivery_tracking_system\driver_app\android\app\build\outputs\apk\release\app-release.apk"
$targetDir  = "D:\delivery_tracking_system\backend\public\downloads"
$targetApk  = Join-Path $targetDir "raktdoot-driver.apk"

$tempAligned = "D:\delivery_tracking_system\scratch\temp-aligned.apk"

Write-Host "1. Aligning with 4-byte zipalign..."
if (Test-Path $tempAligned) { Remove-Item $tempAligned -Force }
& $zipalign -p -f 4 $srcApk $tempAligned

Write-Host "2. Signing with apksigner for v1 + v2 + v3 schemes (min-sdk 21)..."
if (Test-Path $targetApk) { Remove-Item $targetApk -Force }
& $apksigner sign --ks $keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --min-sdk-version 21 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out $targetApk $tempAligned

Write-Host "3. Verifying complete multi-scheme signatures..."
& $apksigner verify --verbose --min-sdk-version 21 $targetApk | Select-Object -First 10

Write-Host "4. Updating web/dist and web/public with production-ready APK..."
Copy-Item $targetApk "D:\delivery_tracking_system\web\dist\raktdoot-driver.apk" -Force
Copy-Item $targetApk "D:\delivery_tracking_system\web\public\raktdoot-driver.apk" -Force

$finalItem = Get-Item $targetApk
Write-Host "SUCCESS! Final APK size: $($finalItem.Length) bytes ($([math]::Round($finalItem.Length / 1MB, 2)) MB)"
