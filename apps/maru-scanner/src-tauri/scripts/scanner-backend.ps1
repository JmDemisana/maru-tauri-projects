# scanner-backend.ps1 - WIA backend helper for Maru Scanner
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("list", "scan", "create-archive", "extract-archive")]
    [string]$Action,

    [string]$DeviceId = "",
    [string]$DeviceName = "",
    [ValidateSet("Flatbed", "Feeder")][string]$Source = "Flatbed",
    [ValidateSet("Color", "Gray", "Text")][string]$ColorMode = "Color",
    [int]$Dpi = 300,
    [ValidateSet("PNG", "JPEG", "BMP")][string]$Format = "PNG",
    [ValidateSet("Entire", "Folio", "Legal", "Letter", "A4", "HalfLetter", "4R", "Custom")][string]$Precrop = "Entire",
    [double]$CustomWidthInches = 8.5,
    [double]$CustomHeightInches = 11.0,
    [string]$OutDir = "",
    [string]$FileNamePrefix = "Scan",
    [string]$ArchiveFile = "",
    [string]$SourceFolder = "",
    [string]$DestFolder = "",
    [switch]$ShowDialog,
    [switch]$NoRelaunch
)

$ErrorActionPreference = "Stop"

$FormatGuids = @{
    PNG  = "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}"
    JPEG = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
    BMP  = "{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}"
}
$IntentMap = @{ Color = 1; Gray = 2; Text = 4 }

function Write-SetWiaProp($item, [int]$id, $value) {
    try {
        $p = $item.Properties | Where-Object { $_.PropertyID -eq $id } | Select-Object -First 1
        if ($p) {
            $p.Value = $value
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

function Get-WiaPropValue($props, [string]$name, [int]$id = 0) {
    try {
        if ($id -gt 0) {
            $found = $props | Where-Object { $_.PropertyID -eq $id } | Select-Object -First 1
            if ($found) { return $found.Value }
        }
        if ($name) {
            $found = $props | Where-Object { $_.Name -eq $name } | Select-Object -First 1
            if ($found) { return $found.Value }
        }
        return $null
    } catch {
        return $null
    }
}

function Get-WiaPropMax($item, [int]$id) {
    try {
        $p = $item.Properties | Where-Object { $_.PropertyID -eq $id } | Select-Object -First 1
        if ($p -and $null -ne $p.SubTypeMax) {
            return [int]$p.SubTypeMax
        }
        return 0
    } catch {
        return 0
    }
}

function Create-ThumbnailAndPreview($srcPath, [int]$MaxWidth, [int]$Quality, [string]$Suffix) {
    Add-Type -AssemblyName System.Drawing | Out-Null
    $img = [System.Drawing.Image]::FromFile($srcPath)
    try {
        $scale = [Math]::Min(1.0, [double]$MaxWidth / [double]$img.Width)
        $w = [int]($img.Width * $scale)
        $h = [int]($img.Height * $scale)
        $bmp = New-Object System.Drawing.Bitmap $w, $h
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()

        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
        $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

        $dir = [System.IO.Path]::GetDirectoryName($srcPath)
        $base = [System.IO.Path]::GetFileNameWithoutExtension($srcPath)
        $outPath = Join-Path $dir "$base.$Suffix.jpg"

        $bmp.Save($outPath, $codec, $ep)
        $bmp.Dispose()
        return @{ Path = $outPath; Width = $w; Height = $h }
    } finally {
        $img.Dispose()
    }
}

# 32-bit SysWOW64 bounce if 64-bit WIA returns zero scanners
function Test-And-Relaunch-32Bit {
    if (-not $NoRelaunch -and [Environment]::Is64BitProcess) {
        $syswow = Join-Path $env:WINDIR "SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
        if (Test-Path -LiteralPath $syswow) {
            $cmd = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action $Action"
            if ($DeviceId) { $cmd += " -DeviceId `"$DeviceId`"" }
            if ($DeviceName) { $cmd += " -DeviceName `"$DeviceName`"" }
            if ($Source) { $cmd += " -Source $Source" }
            if ($ColorMode) { $cmd += " -ColorMode $ColorMode" }
            if ($Dpi) { $cmd += " -Dpi $Dpi" }
            if ($Format) { $cmd += " -Format $Format" }
            if ($Precrop) { $cmd += " -Precrop $Precrop" }
            if ($CustomWidthInches) { $cmd += " -CustomWidthInches $CustomWidthInches" }
            if ($CustomHeightInches) { $cmd += " -CustomHeightInches $CustomHeightInches" }
            if ($OutDir) { $cmd += " -OutDir `"$OutDir`"" }
            if ($FileNamePrefix) { $cmd += " -FileNamePrefix `"$FileNamePrefix`"" }
            if ($ArchiveFile) { $cmd += " -ArchiveFile `"$ArchiveFile`"" }
            if ($SourceFolder) { $cmd += " -SourceFolder `"$SourceFolder`"" }
            if ($DestFolder) { $cmd += " -DestFolder `"$DestFolder`"" }
            if ($ShowDialog) { $cmd += " -ShowDialog" }
            $cmd += " -NoRelaunch"

            & $syswow $cmd
            exit $LASTEXITCODE
        }
    }
}

# --- Action: list ---
if ($Action -eq "list") {
    try {
        $dm = New-Object -ComObject WIA.DeviceManager
        $scanners = @($dm.DeviceInfos | Where-Object { $_.Type -eq 1 })
    } catch {
        $scanners = @()
    }

    if ($scanners.Count -eq 0 -and -not $NoRelaunch) {
        Test-And-Relaunch-32Bit
    }

    $list = @()
    foreach ($s in $scanners) {
        $devId = Get-WiaPropValue $s.Properties "DeviceID"
        $name = Get-WiaPropValue $s.Properties "Name"
        $desc = Get-WiaPropValue $s.Properties "Description"

        # Check if connected device supports feeder
        $hasFeeder = $false
        $hasFlatbed = $true
        try {
            $connected = $s.Connect()
            $docHandlingCap = Get-WiaPropValue $connected.Properties "Document Handling Capabilities" 3086
            if ($null -ne $docHandlingCap) {
                # 0x01 = Feeder supported, 0x02 = Flatbed supported
                $hasFeeder = ($docHandlingCap -band 1) -ne 0
                $hasFlatbed = ($docHandlingCap -band 2) -ne 0
            }
        } catch {}

        $list += @{
            id = $devId
            name = if ($name) { $name } else { "WIA Scanner" }
            description = if ($desc) { $desc } else { "" }
            hasFeeder = $hasFeeder
            hasFlatbed = $hasFlatbed
        }
    }

    $json = ConvertTo-Json -InputObject $list -Compress
    Write-Output "RESULT:$json"
    exit 0
}

# --- Action: create-archive (.scan zip archive) ---
if ($Action -eq "create-archive") {
    if (-not $ArchiveFile -or -not $SourceFolder) {
        $err = ConvertTo-Json @{ ok = $false; error = "ArchiveFile and SourceFolder are required." } -Compress
        Write-Output "RESULT:$err"
        exit 1
    }
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
        if (Test-Path -LiteralPath $ArchiveFile) {
            Remove-Item -LiteralPath $ArchiveFile -Force
        }
        $archDir = [System.IO.Path]::GetDirectoryName($ArchiveFile)
        if (-not (Test-Path -LiteralPath $archDir)) {
            New-Item -ItemType Directory -Path $archDir -Force | Out-Null
        }
        [System.IO.Compression.ZipFile]::CreateFromDirectory($SourceFolder, $ArchiveFile, [System.IO.Compression.CompressionLevel]::Optimal, $false)
        $res = ConvertTo-Json @{ ok = $true; archivePath = $ArchiveFile } -Compress
        Write-Output "RESULT:$res"
        exit 0
    } catch {
        $err = ConvertTo-Json @{ ok = $false; error = $_.Exception.Message } -Compress
        Write-Output "RESULT:$err"
        exit 1
    }
}

# --- Action: extract-archive ---
if ($Action -eq "extract-archive") {
    if (-not $ArchiveFile -or -not $DestFolder) {
        $err = ConvertTo-Json @{ ok = $false; error = "ArchiveFile and DestFolder are required." } -Compress
        Write-Output "RESULT:$err"
        exit 1
    }
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
        if (-not (Test-Path -LiteralPath $DestFolder)) {
            New-Item -ItemType Directory -Path $DestFolder -Force | Out-Null
        }
        [System.IO.Compression.ZipFile]::ExtractToDirectory($ArchiveFile, $DestFolder)
        $manifestPath = Join-Path $DestFolder "manifest.json"
        $manifest = ""
        if (Test-Path -LiteralPath $manifestPath) {
            $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8
        }
        $res = ConvertTo-Json @{ ok = $true; destFolder = $DestFolder; manifest = $manifest } -Compress
        Write-Output "RESULT:$res"
        exit 0
    } catch {
        $err = ConvertTo-Json @{ ok = $false; error = $_.Exception.Message } -Compress
        Write-Output "RESULT:$err"
        exit 1
    }
}

# --- Action: scan ---
if ($Action -eq "scan") {
    try {
        $dm = New-Object -ComObject WIA.DeviceManager
        $scanners = @($dm.DeviceInfos | Where-Object { $_.Type -eq 1 })
    } catch {
        $scanners = @()
    }

    if ($scanners.Count -eq 0 -and -not $NoRelaunch) {
        Test-And-Relaunch-32Bit
    }

    if ($scanners.Count -eq 0) {
        $err = ConvertTo-Json @{ ok = $false; error = "No WIA scanner detected. Please make sure the scanner is powered on and connected." } -Compress
        Write-Output "RESULT:$err"
        exit 2
    }

    $target = $null
    if ($DeviceId) {
        $target = $scanners | Where-Object { (Get-WiaPropValue $_.Properties "DeviceID") -eq $DeviceId } | Select-Object -First 1
    }
    if (-not $target -and $DeviceName) {
        $target = $scanners | Where-Object { (Get-WiaPropValue $_.Properties "Name") -like "*$DeviceName*" } | Select-Object -First 1
    }
    if (-not $target) {
        $target = $scanners[0]
    }

    if (-not $OutDir) {
        $OutDir = Join-Path ([Environment]::GetFolderPath("MyPictures")) "MaruScans"
    }
    if (-not (Test-Path -LiteralPath $OutDir)) {
        New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    }

    try {
        $device = $target.Connect()
    } catch {
        $err = ConvertTo-Json @{ ok = $false; error = "Failed to connect to scanner: $($_.Exception.Message)" } -Compress
        Write-Output "RESULT:$err"
        exit 3
    }

    # Document Handling Select: 1 = Feeder, 2 = Flatbed
    $handlingSelect = if ($Source -eq "Feeder") { 1 } else { 2 }
    Write-SetWiaProp $device 3088 $handlingSelect | Out-Null

    # If feeder is selected, check status
    if ($Source -eq "Feeder") {
        Write-SetWiaProp $device 3096 1 | Out-Null # Scan 1 page per trigger
        $status = Get-WiaPropValue $device.Properties "Document Handling Status" 3087
        if ($null -ne $status) {
            # Bit 1 = Feed ready, Bit 2 = Flatbed ready, Bit 4 = Paper jam, Bit 8 = Empty
            if (($status -band 8) -ne 0) {
                $err = ConvertTo-Json @{ ok = $false; error = "The document feeder is empty. Place your paper into the feeder tray, Senpai!" } -Compress
                Write-Output "RESULT:$err"
                exit 4
            }
        }
    }

    $item = $null
    try {
        $item = $device.Items.Item(1)
    } catch {
        $err = ConvertTo-Json @{ ok = $false; error = "Scanner item channel unavailable: $($_.Exception.Message)" } -Compress
        Write-Output "RESULT:$err"
        exit 5
    }

    # Set Color Mode & Resolution
    Write-SetWiaProp $item 6146 $IntentMap[$ColorMode] | Out-Null
    Write-SetWiaProp $item 6147 $Dpi | Out-Null
    Write-SetWiaProp $item 6148 $Dpi | Out-Null
    Write-SetWiaProp $item 4104 $FormatGuids[$Format] | Out-Null

    # Extent calculations
    $maxWidth = Get-WiaPropMax $item 6151
    $maxHeight = Get-WiaPropMax $item 6152
    if ($maxWidth -le 0) { $maxWidth = [int](8.5 * $Dpi) }
    if ($maxHeight -le 0) { $maxHeight = [int](14.0 * $Dpi) }

    $targetW = $maxWidth
    $targetH = $maxHeight

    switch ($Precrop) {
        "Entire" {
            $targetW = $maxWidth
            $targetH = $maxHeight
        }
        "Letter" {
            # 8.5 x 11 inches
            $targetW = [Math]::Min($maxWidth, [int](8.5 * $Dpi))
            $targetH = [Math]::Min($maxHeight, [int](11.0 * $Dpi))
        }
        "A4" {
            # 8.27 x 11.69 inches (210 x 297 mm)
            $targetW = [Math]::Min($maxWidth, [int](8.27 * $Dpi))
            $targetH = [Math]::Min($maxHeight, [int](11.69 * $Dpi))
        }
        "Folio" {
            # 8.5 x 13 inches (Philippine long paper)
            $targetW = [Math]::Min($maxWidth, [int](8.5 * $Dpi))
            $targetH = [Math]::Min($maxHeight, [int](13.0 * $Dpi))
        }
        "Legal" {
            # 8.5 x 14 inches (Standard Legal)
            $targetW = [Math]::Min($maxWidth, [int](8.5 * $Dpi))
            $targetH = [Math]::Min($maxHeight, [int](14.0 * $Dpi))
        }
        "HalfLetter" {
            # 5.5 x 8.5 inches (Statement)
            $targetW = [Math]::Min($maxWidth, [int](5.5 * $Dpi))
            $targetH = [Math]::Min($maxHeight, [int](8.5 * $Dpi))
        }
        "4R" {
            # 4.0 x 6.0 inches (102 x 152 mm photo print)
            $targetW = [Math]::Min($maxWidth, [int](4.0 * $Dpi))
            $targetH = [Math]::Min($maxHeight, [int](6.0 * $Dpi))
        }
        "Custom" {
            $targetW = [Math]::Min($maxWidth, [int]($CustomWidthInches * $Dpi))
            $targetH = [Math]::Min($maxHeight, [int]($CustomHeightInches * $Dpi))
        }
    }

    Write-SetWiaProp $item 6149 0 | Out-Null # Horizontal Start
    Write-SetWiaProp $item 6150 0 | Out-Null # Vertical Start

    $cropBox = $null
    if ($Source -eq "Flatbed") {
        # FLATBED SCAN: Always scan the ENTIRE flatbed glass so we can recover it if a wrong
        # precrop was chosen later. The precrop is non-destructive and applied in-app.
        Write-SetWiaProp $item 6151 $maxWidth | Out-Null
        Write-SetWiaProp $item 6152 $maxHeight | Out-Null
        if ($Precrop -ne "Entire") {
            $cropBox = @{
                x = 0
                y = 0
                width = [Math]::Min($maxWidth, $targetW)
                height = [Math]::Min($maxHeight, $targetH)
            }
        }
    } else {
        # FEEDER (ADF) SCAN: What is saved at the feeder is strictly the page size,
        # so it won't be confused with multiple document scanning.
        Write-SetWiaProp $item 6151 $targetW | Out-Null
        Write-SetWiaProp $item 6152 $targetH | Out-Null
        $cropBox = $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $ext = @{ PNG = "png"; JPEG = "jpg"; BMP = "bmp" }[$Format]

    $scannedPages = @()

    if ($Source -eq "Feeder") {
        # ADF BATCH SCANNING: Scan all pages loaded in the feeder tray automatically
        # without requiring the user to click scan for every single sheet!
        Write-SetWiaProp $device 3096 0 | Out-Null # 0 = All pages in ADF

        $pageIndex = 1
        $hasMore = $true

        while ($hasMore) {
            # Check if feeder is empty before attempting transfer
            $status = Get-WiaPropValue $device.Properties "Document Handling Status" 3087
            if ($null -ne $status -and ($status -band 8) -ne 0) {
                if ($pageIndex -eq 1) {
                    $err = ConvertTo-Json @{ ok = $false; error = "The document feeder is empty. Place your paper stack in the feeder tray!" } -Compress
                    Write-Output "RESULT:$err"
                    exit 4
                }
                break
            }

            $pageImg = $null
            if ($ShowDialog -and $pageIndex -eq 1) {
                $dlg = New-Object -ComObject WIA.CommonDialog
                $pageImg = $dlg.ShowTransfer($item, $FormatGuids[$Format], $false)
            } else {
                try {
                    $pageImg = $item.Transfer($FormatGuids[$Format])
                } catch {
                    $exMsg = $_.Exception.Message
                    # WIA_ERROR_PAPER_EMPTY: 0x80210003
                    if ($exMsg -match "0x80210003" -or $exMsg -match "paper.*empty" -or $exMsg -match "out of paper") {
                        if ($pageIndex -gt 1) {
                            # Normal end of feeder batch
                            break
                        } else {
                            $err = ConvertTo-Json @{ ok = $false; error = "The document feeder is empty. Place your paper into the feeder tray!" } -Compress
                            Write-Output "RESULT:$err"
                            exit 6
                        }
                    }
                    if ($pageIndex -gt 1) {
                        # Feeder reached end of stack
                        break
                    } else {
                        throw $_
                    }
                }
            }

            if (-not $pageImg) { break }

            $pNumStr = "{0:D2}" -f $pageIndex
            $pageFileName = "$FileNamePrefix-$stamp-$pNumStr.$ext"
            $pageFilePath = Join-Path $OutDir $pageFileName
            $pageImg.SaveFile($pageFilePath)

            $previewInfo = Create-ThumbnailAndPreview $pageFilePath 1600 85 "preview"
            $thumbInfo = Create-ThumbnailAndPreview $pageFilePath 320 80 "thumb"

            $scannedPages += @{
                pageNumber = $pageIndex
                filePath = $pageFilePath
                fileName = $pageFileName
                previewPath = $previewInfo.Path
                thumbPath = $thumbInfo.Path
                width = $pageImg.Width
                height = $pageImg.Height
                dpi = $Dpi
                colorMode = $ColorMode
                precrop = $Precrop
                source = "Feeder"
                cropRect = $null
                fullFlatbedPreserved = $false
            }

            $pageIndex++

            # Check if paper remains in feeder
            $statusAfter = Get-WiaPropValue $device.Properties "Document Handling Status" 3087
            if ($null -ne $statusAfter -and ($statusAfter -band 8) -ne 0) {
                break
            }
        }
    } else {
        # FLATBED SCANNING: Single page scan with FULL glass retention
        $outFileName = "$FileNamePrefix-$stamp.$ext"
        $outFilePath = Join-Path $OutDir $outFileName

        $scannedImage = $null
        if ($ShowDialog) {
            $dlg = New-Object -ComObject WIA.CommonDialog
            $scannedImage = $dlg.ShowTransfer($item, $FormatGuids[$Format], $false)
        } else {
            try {
                $scannedImage = $item.Transfer($FormatGuids[$Format])
            } catch {
                $dlg = New-Object -ComObject WIA.CommonDialog
                $scannedImage = $dlg.ShowTransfer($item, $FormatGuids[$Format], $false)
            }
        }

        if (-not $scannedImage) {
            $err = ConvertTo-Json @{ ok = $false; error = "Scan did not produce an image. Document placed on glass?" } -Compress
            Write-Output "RESULT:$err"
            exit 7
        }

        $scannedImage.SaveFile($outFilePath)

        $previewInfo = Create-ThumbnailAndPreview $outFilePath 1600 85 "preview"
        $thumbInfo = Create-ThumbnailAndPreview $outFilePath 320 80 "thumb"

        $scannedPages += @{
            pageNumber = 1
            filePath = $outFilePath
            fileName = $outFileName
            previewPath = $previewInfo.Path
            thumbPath = $thumbInfo.Path
            width = $scannedImage.Width
            height = $scannedImage.Height
            dpi = $Dpi
            colorMode = $ColorMode
            precrop = $Precrop
            source = "Flatbed"
            cropRect = $cropBox
            fullFlatbedPreserved = ($Precrop -ne "Entire")
        }
    }

    if ($scannedPages.Count -eq 0) {
        $err = ConvertTo-Json @{ ok = $false; error = "No pages were scanned." } -Compress
        Write-Output "RESULT:$err"
        exit 8
    }

    $first = $scannedPages[0]
    $res = @{
        ok = $true
        filePath = $first.filePath
        fileName = $first.fileName
        previewPath = $first.previewPath
        thumbPath = $first.thumbPath
        width = $first.width
        height = $first.height
        dpi = $first.dpi
        colorMode = $first.colorMode
        precrop = $first.precrop
        source = $first.source
        cropRect = $first.cropRect
        fullFlatbedPreserved = $first.fullFlatbedPreserved
        pages = $scannedPages
    }

    $json = ConvertTo-Json -InputObject $res -Depth 4 -Compress
    Write-Output "RESULT:$json"
    exit 0
}
