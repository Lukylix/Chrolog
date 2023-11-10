#include <Windows.h>
#include <stdint.h>
#include <psapi.h>
#include <string>
#include "chrolog.h"
#include <vector>
#include <set>
#include <chrono>

const char *GetActiveApp()
{
  HWND hwnd = GetForegroundWindow();
  DWORD processId;
  GetWindowThreadProcessId(hwnd, &processId);
  HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, processId);
  if (hProcess == NULL)
  {
    return "";
  }
  WCHAR name[MAX_PATH];
  int size = GetModuleFileNameExW(hProcess, 0, name, MAX_PATH);
  char processPath[MAX_PATH];
  wcstombs(processPath, name, MAX_PATH);
  CloseHandle(hProcess);

  std::string str(processPath);
  size_t found = str.find_last_of("/\\");
  std::string lastPart = str.substr(found + 1);
  char *process = new char[lastPart.length() + 1];
  strcpy(process, lastPart.c_str());
  return process;
}

char **GetProcessInfos(int pid)
{
  HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, pid);
  if (hProcess == NULL)
  {
    char **vec = new char *[2];
    vec[0] = new char[1];
    vec[0][0] = '\0';
    vec[1] = new char[1];
    vec[1][0] = '\0';
    return vec;
  }

  WCHAR name[MAX_PATH];
  GetModuleFileNameExW(hProcess, 0, name, MAX_PATH);
  char *processPath = new char[MAX_PATH];
  wcstombs(processPath, name, MAX_PATH);

  WCHAR processFullPath[MAX_PATH];
  DWORD bufferSize = MAX_PATH;
  QueryFullProcessImageNameW(hProcess, 0, processFullPath, &bufferSize);
  CloseHandle(hProcess);

  char *processPathChar = new char[MAX_PATH];
  wcstombs(processPathChar, processFullPath, MAX_PATH);

  std::string str(processPath);
  std::string lastPart = str.substr(str.find_last_of("/\\") + 1);
  char *process = new char[lastPart.length() + 1];
  strcpy(process, lastPart.c_str());

  char **vec = new char *[2];
  vec[0] = process;
  vec[1] = processPathChar;

  delete[] processPath;

  return vec;
}
std::set<int> g_processIds;
static std::set<int>::iterator processIter;

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam)
{
  DWORD processId;
  GetWindowThreadProcessId(hwnd, &processId);
  if (processId != 0)
  {
    g_processIds.insert(static_cast<int>(processId));
  }
  return TRUE;
}

bool EnumWindowsProcessIds()
{
  g_processIds.clear();
  bool success = EnumWindows(EnumWindowsProc, 0);
  processIter = g_processIds.begin();
  return success;
}

int GetNextProcessId()
{

  if (processIter == g_processIds.end())
  {
    processIter = g_processIds.begin();
    return 0;
  }
  int processId = *processIter;
  ++processIter;
  return processId ? processId : 0;
}

static double lastInputTime = 0;
static DWORD lastInputTickCount = 0;

void UpdateLastInputTime(DWORD tickCount)
{
  if (lastInputTickCount == tickCount)
    return;
  if (lastInputTickCount == 0)
  {
    lastInputTickCount = tickCount;
    return;
  }
  auto now = std::chrono::system_clock::now();
  auto duration = now.time_since_epoch();
  auto milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
  lastInputTime = static_cast<double>(milliseconds);
  lastInputTickCount = tickCount;
}

double GetLastInputTime()
{
  LASTINPUTINFO lastInputInfo;
  lastInputInfo.cbSize = sizeof(LASTINPUTINFO);
  GetLastInputInfo(&lastInputInfo);
  UpdateLastInputTime(lastInputInfo.dwTime);
  return lastInputTime;
}