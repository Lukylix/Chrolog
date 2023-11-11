#pragma once
#ifdef _WIN32
#include <Windows.h>

extern "C" __declspec(dllexport) int GetProcessIdFromWindow(HWND hWnd);
extern "C" __declspec(dllexport) const char *GetActiveApp();
extern "C" __declspec(dllexport) char **GetProcessInfos(int pid);
extern "C" __declspec(dllexport) bool EnumWindowsProcessIds();
extern "C" __declspec(dllexport) int GetNextProcessId();
extern "C" __declspec(dllexport) double GetLastInputTime();

#endif

#ifdef linux

extern "C"
{
  const char *GetActiveApp();
  bool EnumWindowsProcessIds();
  int GetNextProcessId();
  char **GetProcessInfos(int pid);
  double GetLastInputTime();
}

#endif