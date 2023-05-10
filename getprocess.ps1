Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class User32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
  }
"@

$foregroundWindow = [User32]::GetForegroundWindow()
if ($foregroundWindow -ne [IntPtr]::Zero) {
  $foregroundPID = (Get-Process | Where-Object { $_.MainWindowHandle -eq $foregroundWindow }).Id
  Write-Host "$foregroundPID"
} else {
  Write-Host "Could not get the handle of the foreground window."
}
