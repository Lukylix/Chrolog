#ifdef _WIN32
#include <Windows.h>
#include <psapi.h>
#endif
#ifdef linux
#include <X11/Xlib.h>
#include <X11/Xatom.h>
#include <iostream>
#include <limits.h>
#include <unistd.h>
#include <cstring>
#include <dirent.h>
#include <stdlib.h>
#include <filesystem>
#include <dlfcn.h>
#include <signal.h>
#include <sys/stat.h>
#include <set>
#include <fstream>
#include <unordered_set>
#endif

#include <stdint.h>
#include <string>
#include "chrolog.h"
#include <vector>
#include <set>
#include <chrono>
#include <thread>
#include <mutex>

#ifdef _WIN32
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

std::mutex lastInputTimeMutex;
static double lastInputTime = 0;

double GetLastInputTime()
{
  lastInputTimeMutex.lock();
  double lastInputTimeCopy = lastInputTime;
  lastInputTimeMutex.unlock();
  return lastInputTimeCopy;
}

HHOOK kHook = NULL;
HHOOK mHook = NULL;
std::thread thread = std::thread();

LRESULT CALLBACK MouseHookProc(int nCode, WPARAM wparam, LPARAM lparam)
{
  LRESULT result = CallNextHookEx(NULL, nCode, wparam, lparam);
  if (nCode < 0)
    return result;
  auto now = std::chrono::system_clock::now();
  auto duration = now.time_since_epoch();
  auto milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
  lastInputTimeMutex.lock();
  lastInputTime = static_cast<double>(milliseconds);
  lastInputTimeMutex.unlock();
  return result;
}

LRESULT CALLBACK KeyboardHookProc(int nCode, WPARAM wparam, LPARAM lparam)
{
  LRESULT result = CallNextHookEx(NULL, nCode, wparam, lparam);
  if (nCode < 0)
    return result;
  auto now = std::chrono::system_clock::now();
  auto duration = now.time_since_epoch();
  auto milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
  lastInputTimeMutex.lock();
  lastInputTime = static_cast<double>(milliseconds);
  lastInputTimeMutex.unlock();
  return result;
}

void SetKeyboardHook()
{
  if (kHook != NULL)
    return;
  kHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardHookProc, GetModuleHandle(NULL), 0);
}

void UnsetKeyboardHook()
{
  if (kHook == NULL)
    return;
  UnhookWindowsHookEx(kHook);
  kHook = NULL;
}

void SetMouseHook()
{
  if (mHook != NULL)
    return;
  mHook = SetWindowsHookEx(WH_MOUSE_LL, MouseHookProc, GetModuleHandle(NULL), 0);
}

void UnsetMouseHook()
{
  if (mHook == NULL)
    return;
  UnhookWindowsHookEx(mHook);
  mHook = NULL;
}

void HookThread()
{
  SetMouseHook();
  SetKeyboardHook();
  MSG Msg;
  while (GetMessage(&Msg, NULL, 0, 0))
  {
    TranslateMessage(&Msg);
    DispatchMessage(&Msg);
  }
  UnsetMouseHook();
  UnsetKeyboardHook();
}

void CreateHookThreads()
{
  thread = std::thread(HookThread);
}

void KillThread()
{
  if (thread.joinable())
  {
    thread = std::thread();
  }
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD ul_reason_for_call, LPVOID lpReserved)
{
  switch (ul_reason_for_call)
  {
  case DLL_PROCESS_ATTACH:
    CreateHookThreads();
    break;
  case DLL_THREAD_ATTACH:
    break;
  case DLL_THREAD_DETACH:
    break;
  case DLL_PROCESS_DETACH:
    UnsetMouseHook();
    UnsetKeyboardHook();
    KillThread();
    break;
  }
  return TRUE;
}

#endif

#ifdef linux // Linux

static bool shouldExit = false;

static std::set<int> g_processIds;
static std::set<int>::iterator processIter;

const char *EmptyString()
{
  char *cstr = new char[1];
  cstr[0] = '\0';
  return cstr;
}

int GetActiveWindowPID()
{
  Display *display = XOpenDisplay(nullptr);
  if (!display)
  {
    return -1;
  }

  Window root = DefaultRootWindow(display);
  Atom netActiveWindow = XInternAtom(display, "_NET_ACTIVE_WINDOW", False);
  Atom type;
  int format;
  unsigned long nitems;
  unsigned long bytesAfter;
  unsigned char *data;
  if (XGetWindowProperty(display, root, netActiveWindow, 0, 1, False, XA_WINDOW, &type, &format, &nitems, &bytesAfter, &data) != Success || nitems == 0)
  {
    XCloseDisplay(display);
    return -1;
  }

  Window win = ((Window *)data)[0];
  XFree(data);
  if (win == None)
  {
    XCloseDisplay(display);
    return -1;
  }
  Atom netWmPid = XInternAtom(display, "_NET_WM_PID", False);
  if (XGetWindowProperty(display, win, netWmPid, 0, 1, False, XA_CARDINAL, &type, &format, &nitems, &bytesAfter, &data) != Success || nitems == 0)
  {
    XCloseDisplay(display);
    return -1;
  }
  int pid = ((int *)data)[0];
  XFree(data);
  return pid;
}

const char *GetProcessPath(int pid)
{
  char procPath[PATH_MAX];
  snprintf(procPath, sizeof(procPath), "/proc/%d/exe", pid);
  char processName[PATH_MAX];
  ssize_t len = readlink(procPath, processName, sizeof(processName) - 1);
  if (len == -1)
  {
    return EmptyString();
  }
  processName[len] = '\0';
  std::string to_remove = " (deleted)";
  std::string processNameStr = processName;
  size_t pos = processNameStr.find(to_remove);
  if (pos != std::string::npos)
  {
    processNameStr.erase(pos, to_remove.length());
  }
  strcpy(processName, processNameStr.c_str());

  const char *processNameConst = processName;
  return processNameConst;
}

const char *GetProcessName(const char *processPath)
{
  if (processPath[0] == '\0')
  {
    return EmptyString();
  }
  size_t lastSlashIndex = std::string(processPath).find_last_of("/");
  if (lastSlashIndex == std::string::npos)
    return EmptyString();
  std::string process = processPath;
  process = process.substr(lastSlashIndex + 1);
  if (process.empty())
    return EmptyString();
  char *cstr = new char[process.length() + 1];
  strcpy(cstr, process.c_str());
  return cstr;
}

const char *GetActiveApp()
{
  int activeWindowPID = GetActiveWindowPID();
  if (activeWindowPID == -1)
  {
    return EmptyString();
  }
  const char *processPath = GetProcessPath(activeWindowPID);
  if (processPath[0] == '\0')
  {
    return EmptyString();
  }
  const char *processName = GetProcessName(processPath);
  return processName;
}

int getProcessUID(int pid)
{
  struct stat info;
  char path[256];
  sprintf(path, "/proc/%d", pid);
  if (stat(path, &info) == 0)
  {
    int uid = info.st_uid;
    return uid;
  }
  return -1;
}

int GetMinUID()
{
  std::ifstream file("/etc/login.defs");
  std::string line;

  while (std::getline(file, line))
  {
    std::istringstream iss(line);
    std::string word;
    iss >> word;
    if (word == "UID_MIN")
    {
      iss >> word;
      return std::stoi(word);
      break;
    }
  }

  return 1000;
}

static int minUID = GetMinUID();

char *IntToString(int value)
{
  int length = snprintf(NULL, 0, "%d", value);
  char *str = new char[length + 1];
  snprintf(str, length + 1, "%d", value);
  return str;
}

char **GetProcessInfos(int pid)
{
  const char *processPathConst = GetProcessPath(pid);
  char *processPath = new char[strlen(processPathConst) + 1];
  strcpy(processPath, processPathConst);

  const char *processNameConst = GetProcessName(processPath);
  char *processName = new char[strlen(processNameConst) + 1];
  strcpy(processName, processNameConst);

  char **infos = new char *[2];
  infos[0] = processName;
  infos[1] = processPath;
  return infos;
}

bool EnumWindowsProcessIds()
{
  std::unordered_set<std::string> processNames;

  g_processIds.clear();
  DIR *dir = opendir("/proc");
  if (dir == NULL)
  {
    return false;
  }
  struct dirent *entry;
  while ((entry = readdir(dir)) != NULL)
  {
    int pid = atoi(entry->d_name);
    int uid = getProcessUID(pid);
    if (uid < minUID)
      continue;

    const char *path = GetProcessPath(pid);
    if (path[0] == '\0')
      continue;

    const char *processName = GetProcessName(path);
    if (processName[0] == '\0' || processNames.find(processName) != processNames.end())

      continue;

    processNames.insert(processName);

    g_processIds.insert(pid);
  }

  closedir(dir);
  processIter = g_processIds.begin();
  return true;
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

std::string getLibraryPath()
{
  Dl_info dl_info;
  dladdr((void *)getLibraryPath, &dl_info);
  std::filesystem::path libPath(dl_info.dli_fname);
  return libPath.parent_path();
}

pid_t child_pid;

void sendSiginalToChild(int sig)
{
  if (child_pid && child_pid != 0)
  {
    kill(child_pid, sig);
  }
}

void initialize()
{
  setenv("DISPLAY", ":0", 0);
  std::string path = getLibraryPath() + "/chrolog-server";
  std::string cmd = "'" + path + "'";
  if (!std::filesystem::exists(path))
    return;
  std::string cmdSudo = "/usr/bin/pkexec --disable-internal-agent " + cmd + " &";
  pid_t pid = fork();
  if (pid == 0)
  {
    execl("/bin/sh", "sh", "-c", cmdSudo.c_str(), (char *)NULL);
  }
  else
  {
    child_pid = pid;
    signal(SIGINT, sendSiginalToChild);
    signal(SIGTERM, sendSiginalToChild);
    signal(SIGKILL, sendSiginalToChild);
    signal(SIGQUIT, sendSiginalToChild);
  }
}
void destroy()
{
  shouldExit = true;
}

void __attribute__((constructor)) initialize();
void __attribute__((destructor)) destroy();

#endif