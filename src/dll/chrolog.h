#pragma once

#include <Windows.h>

extern "C" __declspec(dllexport) int GetProcessIdFromWindow(HWND hWnd);
extern "C" __declspec(dllexport) const char *GetActiveApp();
extern "C" __declspec(dllexport) char **GetProcessInfos(int pid);
extern "C" __declspec(dllexport) bool EnumWindowsProcessIds();
extern "C" __declspec(dllexport) int GetNextProcessId();