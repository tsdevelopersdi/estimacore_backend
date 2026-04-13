# Configuration
$ContainerName = "hcga-admin-backend" 
$ContainerDir = "/app/photos"
$HostDir = "Z:\TS-SDI\photos"
$TempDir = "$env:TEMP\docker_sync_buffer"

Write-Host "INITIALIZING..."

if (-not (Test-Path $TempDir)) { 
    Write-Host "Creating temp dir $TempDir"
    New-Item -ItemType Directory -Path $TempDir | Out-Null 
}

Write-Host "--------------------------------------------------------"
Write-Host "  Starting 2-Way SMART Sync (Buffered)"
Write-Host "  Container: $ContainerName"
Write-Host "  Host:      $HostDir"
Write-Host "  Temp Buffer: $TempDir"
Write-Host "--------------------------------------------------------"
Write-Host "Press Ctrl+C to stop."

function Get-ContainerFiles {
    Write-Host "[DEBUG] Executing docker ls..." -NoNewline
    try {
        # Added timeout to prevent hanging forever
        $output = docker exec $ContainerName ls -1 "$ContainerDir" 2>$null
        Write-Host " Done." -ForegroundColor Green
        if ($LASTEXITCODE -ne 0) { return @() }
        return $output
    } catch {
        Write-Host " Error: $_" -ForegroundColor Red
        return @() 
    }
}

while ($true) {
    try {
        $timestamp = Get-Date -Format "HH:mm:ss"

        Write-Host "`n[$timestamp] Loop Start" -ForegroundColor DarkGray

        # --- Check Host Dir ---
        Write-Host "[DEBUG] Checking Host Path ($HostDir)..." -NoNewline
        if (-not (Test-Path $HostDir)) {
             Write-Host " FAIL (Not Found)" -ForegroundColor Red
            Start-Sleep -Seconds 5
            continue
        }
        Write-Host " OK" -ForegroundColor Green

        # --- List Host Files ---
        Write-Host "[DEBUG] Listing Host Files..." -NoNewline
        $HostFiles = @(Get-ChildItem -Path $HostDir -File | Select-Object -ExpandProperty Name)
        Write-Host " Found $(($HostFiles).Count)"

        # --- List Container Files ---
        Write-Host "[DEBUG] Listing Container Files..." -NoNewline
        $ContainerFiles = @(Get-ContainerFiles)
        Write-Host " Found $(($ContainerFiles).Count)"
        
        # --- 2. Container -> Host ---
        $FilesMissingOnHost = $ContainerFiles | Where-Object { $_ -notin $HostFiles }
        $countDown = $FilesMissingOnHost.Count
        if ($countDown -gt 0) {
            Write-Host "Found $countDown files to download." -ForegroundColor Yellow
        }

        foreach ($file in $FilesMissingOnHost) {
            if ([string]::IsNullOrWhiteSpace($file)) { continue }
            try {
                Write-Host "  [DOWN] $file ... " -NoNewline
                $tempPath = Join-Path $TempDir $file
                
                Write-Host "(docker cp)..." -NoNewline
                docker cp "${ContainerName}:${ContainerDir}/${file}" "$tempPath"

                Write-Host "(move to Z:)..." -NoNewline
                Move-Item -Path $tempPath -Destination "$HostDir\$file" -Force
                
                Write-Host "Done" -ForegroundColor Green
            } catch {
                Write-Host "Failed: $_" -ForegroundColor Red
            }
        }

        # --- 3. Host -> Container ---
        $FilesMissingInContainer = $HostFiles | Where-Object { $_ -notin $ContainerFiles }
        $countUp = $FilesMissingInContainer.Count
        if ($countUp -gt 0) {
            Write-Host "Found $countUp files to upload." -ForegroundColor Yellow
        }

        foreach ($file in $FilesMissingInContainer) {
             if ([string]::IsNullOrWhiteSpace($file)) { continue }
            try {
                Write-Host "  [UP]   $file ... " -NoNewline
                $tempPath = Join-Path $TempDir $file

                Write-Host "(copy to temp)..." -NoNewline
                Copy-Item -Path "$HostDir\$file" -Destination $tempPath -Force

                Write-Host "(docker cp)..." -NoNewline
                docker cp "$tempPath" "${ContainerName}:${ContainerDir}/"
                
                Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
                Write-Host "Done" -ForegroundColor Cyan
            } catch {
                Write-Host "Failed: $_" -ForegroundColor Red
            }
        }

    } catch {
        Write-Host "Loop Error: $_" -ForegroundColor Red
    }

    Write-Host "Sleeping..."
    Start-Sleep -Seconds 2
}
