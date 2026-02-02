# Download and Install Visual Studio Build Tools
$installerPath = "$env:TEMP\vs_BuildTools.exe"
$url = "https://aka.ms/vs/17/release/vs_BuildTools.exe"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Visual Studio Build Tools Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Downloading installer..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $url -OutFile $installerPath -UseBasicParsing
    Write-Host "✓ Download complete!" -ForegroundColor Green
} catch {
    Write-Host "✗ Download failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Installing Build Tools..." -ForegroundColor Yellow
Write-Host "This will install:" -ForegroundColor White
Write-Host "  - Desktop development with C++" -ForegroundColor White
Write-Host "  - MSVC compiler" -ForegroundColor White
Write-Host "  - Windows 11 SDK" -ForegroundColor White
Write-Host ""
Write-Host "⏱ This may take 10-20 minutes. Please be patient..." -ForegroundColor Cyan
Write-Host ""

# Install with Desktop development with C++ workload
$process = Start-Process -FilePath $installerPath -ArgumentList `
    "--add", "Microsoft.VisualStudio.Workload.VCTools", `
    "--add", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", `
    "--add", "Microsoft.VisualStudio.Component.Windows11SDK.22621", `
    "--includeRecommended", `
    "--passive", `
    "--wait" -PassThru -Wait

if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 3010) {
    Write-Host ""
    Write-Host "✓ Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ IMPORTANT: You must restart your terminal for changes to take effect!" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Installation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
    Write-Host ""
}

# Cleanup
Remove-Item $installerPath -ErrorAction SilentlyContinue
