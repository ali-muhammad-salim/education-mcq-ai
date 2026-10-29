$src = "$env:TEMP\pgvector_extracted\pgvector-x86_64-pc-windows-msvc-pg16"
$destLib = "C:\Program Files\PostgreSQL\16\lib"
$destShare = "C:\Program Files\PostgreSQL\16\share\extension"

Write-Host "Copying vector.dll to $destLib..."
Copy-Item -Path "$src\lib\vector.dll" -Destination $destLib -Force

Write-Host "Copying extension files to $destShare..."
Copy-Item -Path "$src\share\extension\*" -Destination $destShare -Force

Write-Host "Restarting PostgreSQL Service..."
Restart-Service -Name "postgresql-x64-16" -ErrorAction SilentlyContinue

Write-Host "pgvector installation completed successfully!"
Start-Sleep -Seconds 3
