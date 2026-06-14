param([int]$X = -1, [int]$Y = -1, [string]$Name = "shot", [int]$CropBottom = 64)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, int e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, int e);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$proc = Get-Process | Where-Object { $_.MainWindowTitle -eq "AI Chess" } | Select-Object -First 1
$h = $proc.MainWindowHandle
if (-not $h -or $h -eq 0) { Write-Host "Pencere yok"; exit 1 }
[Win]::ShowWindow($h, 3) | Out-Null    # maximize -> gorev cubugu ustunde durur
Start-Sleep -Milliseconds 300
# ALT-tus hilesi: Windows on-plana-cikma kilidini asar
[Win]::keybd_event(0x12,0,0,0); [Win]::keybd_event(0x12,0,2,0)
$wsh = New-Object -ComObject WScript.Shell
$wsh.AppActivate($proc.Id) | Out-Null
[Win]::BringWindowToTop($h) | Out-Null
[Win]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 600
$r = New-Object Win+RECT
[Win]::GetWindowRect($h, [ref]$r) | Out-Null
if ($X -ge 0 -and $Y -ge 0) {
  [Win]::SetCursorPos($r.Left + $X, $r.Top + $Y) | Out-Null
  Start-Sleep -Milliseconds 200
  [Win]::mouse_event(0x02,0,0,0,0); [Win]::mouse_event(0x04,0,0,0,0)   # left down/up
  Start-Sleep -Milliseconds 900
}
[Win]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top - $CropBottom
$bmp = New-Object System.Drawing.Bitmap($w, $ht)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
$out = Join-Path $PSScriptRoot "$Name.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host "OK $Name : $w x $ht  (winLeft=$($r.Left) winTop=$($r.Top))"
