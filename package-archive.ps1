$exclude = @(
    'node_modules',
    '.git',
    '.vercel',
    'cloudflared.exe',
    'Kyvex-Publish-24-7.zip',
    'scratch',
    'package-archive.ps1'
)

Remove-Item 'Kyvex-Publish-24-7.zip' -Force -ErrorAction SilentlyContinue

$items = Get-ChildItem -Path . | Where-Object { $exclude -notcontains $_.Name }
Compress-Archive -Path $items -DestinationPath 'Kyvex-Publish-24-7.zip' -Force

$zip = Get-Item 'Kyvex-Publish-24-7.zip'
Write-Host "Successfully generated: $($zip.Name) ($([math]::Round($zip.Length / 1MB, 2)) MB)" -ForegroundColor Green
