$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'KyvexBot24-7.lnk'
$targetVbs = 'C:\Users\Aditya Raj\Desktop\DISCORD BOT\start-silent.vbs'
$workDir = 'C:\Users\Aditya Raj\Desktop\DISCORD BOT'

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = 'wscript.exe'
$sc.Arguments = "`"$targetVbs`""
$sc.WorkingDirectory = $workDir
$sc.Description = 'Kyvex Discord Bot 24/7 Silent Background Service'
$sc.Save()

Write-Output "Startup shortcut created successfully: $(Test-Path $shortcutPath)"
