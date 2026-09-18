$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'KyvexBot24-7.lnk'

# 1. Remove the Windows startup shortcut
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "[OK] Windows Startup Shortcut successfully deleted!" -ForegroundColor Green
    Write-Host "     Your PC will no longer start the bot on boot." -ForegroundColor Cyan
} else {
    Write-Host "[INFO] No startup shortcut was found in Windows Startup." -ForegroundColor Yellow
}

# 2. Find and terminate any background processes running the bot (node.exe and cmd.exe loop)
$killed = 0
$allProcesses = Get-CimInstance Win32_Process
foreach ($p in $allProcesses) {
    if ($p.CommandLine -like "*run-bot.bat*" -or 
        $p.CommandLine -like "*start-silent.vbs*" -or 
        ($p.Name -eq "node.exe" -and ($p.CommandLine -like "*src/index.js*" -or $p.CommandLine -like "*src\index.js*"))) {
        Write-Host "[STOPPING] Terminating process PID: $($p.ProcessId) ($($p.Name))..." -ForegroundColor Yellow
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        $killed++
    }
}

if ($killed -gt 0) {
    Write-Host "[OK] Stopped $killed local bot process(es). Your PC is now completely free of bot load!" -ForegroundColor Green
} else {
    Write-Host "[INFO] No local bot process was running." -ForegroundColor Cyan
}

Write-Host "`nAll PC load cleared! You can now host the bot 24/7 on Discloud / Render without keeping your PC ON.`n" -ForegroundColor Green
