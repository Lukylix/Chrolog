#ifdef _WIN32
#include <Windows.h>
#include <psapi.h>
#endif
#ifdef linux
#include <iostream>
#include <stdexcept>
#include <cstring>
#include <vector>
#include <unistd.h>
#include <fcntl.h>
#include <linux/input.h>
#include <mutex>

#endif

#include <stdint.h>
#include <string>
#include "chrolog.h"
#include <vector>
#include <set>
#include <chrono>
#include <thread>

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

static double lastInputTime = 0;

double GetLastInputTime()
{
  return lastInputTime;
}

HHOOK eHook = NULL;
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
  lastInputTime = static_cast<double>(milliseconds);
  return result;
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
  MSG Msg;
  while (GetMessage(&Msg, NULL, 0, 0))
  {
    TranslateMessage(&Msg);
    DispatchMessage(&Msg);
  }
  UnsetMouseHook();
}

void CreateHookThread()
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
    CreateHookThread();
    break;
  case DLL_THREAD_ATTACH:
    break;
  case DLL_THREAD_DETACH:
    break;
  case DLL_PROCESS_DETACH:
    UnsetMouseHook();
    KillThread();
    break;
  }
  return TRUE;
}

#endif

#ifdef linux // Linux

static bool isGonome = false;
static std::set<int> g_processIds;
static std::set<int>::iterator processIter;
std::mutex lastInputTimeMutex;
static double lastInputTime = 0;
static bool shouldExit = false;

std::string trim(const std::string &str)
{
  size_t first = str.find_first_not_of(' ');
  if (std::string::npos == first)
  {
    return str;
  }
  size_t last = str.find_last_not_of(' ');
  return str.substr(first, (last - first + 1));
}

std::string exec(std::string cmd)
{
  const char *cmdChar = cmd.c_str();
  std::array<char, 128> buffer;
  std::string result;
  try
  {
    FILE *pipe = popen(cmdChar, "r");
    if (!pipe)
    {
      throw std::runtime_error("popen() failed!");
    }
    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr)
    {
      result += buffer.data();
    }
    if (pclose(pipe) != 0)
    {
      throw std::runtime_error("pclose() failed!");
    }
  }
  catch (std::exception &e)
  {
    result = "";
    return result;
  }
  return result;
}

const char *GetActiveAppGnome()
{
  std::string cmd = "readlink -f /proc/$(xdotool getwindowpid $(xdotool getwindowfocus))/exe";
  std::string result = exec(cmd.c_str());
  std::string process = trim(result.substr(result.find_last_of("/") + 1));
  char *cstr = new char[process.length() + 1];
  strcpy(cstr, process.c_str());
  return cstr;
}

const char *GetActiveAppX11()
{
  std::string cmd = "readlink -f /proc/$(xprop -id $(xprop -root _NET_ACTIVE_WINDOW | cut -d ' ' -f 5) _NET_WM_PID | cut -d ' ' -f 3)/exe";
  std::string result = exec(cmd.c_str());
  std::string process = trim(result.substr(result.find_last_of("/") + 1));
  char *cstr = new char[process.length() + 1];
  strcpy(cstr, process.c_str());
  return cstr;
}

const char *GetActiveApp()
{
  if (isGonome)
  {
    return GetActiveAppGnome();
  }
  else
  {
    return GetActiveAppX11();
  }
}

char **GetProcessInfos(int pid)
{
  std::string cmd = "ps -p " + std::to_string(pid) + " -o comm=,cmd=";
  std::string result = exec(cmd.c_str());
  std::string resultTrimmed = trim(result);
  std::string process = trim(resultTrimmed.substr(0, resultTrimmed.find(" ")));
  std::string secondHalf = trim(resultTrimmed.substr(resultTrimmed.find(" ") + 1));
  std::string processPath = trim(secondHalf.substr(0, secondHalf.find(" ")));

  char *processChar = new char[process.length() + 1];
  strcpy(processChar, process.c_str());
  char *processPathChar = new char[processPath.length() + 1];
  strcpy(processPathChar, processPath.c_str());
  char **vec = new char *[2];
  if (process.empty())
  {
    vec[0] = new char[1];
    vec[0][0] = '\0';
  }
  else
  {
    vec[0] = processChar;
  }
  if (processPath.empty())
  {
    vec[1] = new char[1];
    vec[1][0] = '\0';
  }
  else
  {
    vec[1] = processPathChar;
  }
  return vec;
}

bool EnumWindowsProcessIds()
{
  g_processIds.clear();
  std::string cmd = "ps -U root -u root -N -o pid=";
  std::string result = exec(cmd.c_str());
  std::string resultTrimmed = trim(result);
  if (resultTrimmed.empty())
  {
    return false;
  }
  std::string delimiter = "\n";
  size_t pos = 0;
  std::string token;
  while ((pos = resultTrimmed.find(delimiter)) != std::string::npos)
  {
    token = resultTrimmed.substr(0, pos);
    int tokenInt = std::stoi(token);
    if (tokenInt < 1000)
    {
      resultTrimmed.erase(0, pos + delimiter.length());
      continue;
    }
    g_processIds.insert(std::stoi(token));
    resultTrimmed.erase(0, pos + delimiter.length());
  }
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

double GetLastInputTime()
{
  return lastInputTime;
}

std::set<std::string> GetInputDevices()
{
  std::set<std::string> devices;
  std::string cmd = "ls /dev/input/by-id/";
  std::string result = exec(cmd.c_str());
  std::string resultTrimmed = trim(result);
  if (resultTrimmed.empty())
  {
    return devices;
  }
  std::string delimiter = "\n";
  size_t pos = 0;
  std::string token;
  while ((pos = resultTrimmed.find(delimiter)) != std::string::npos)
  {
    token = resultTrimmed.substr(0, pos);
    std::string device = trim(token);
    devices.insert(device);
    resultTrimmed.erase(0, pos + delimiter.length());
  }
  return devices;
}

std::vector<std::thread> threads;

void watchInputTread(std::string device)
{
  std::string file = "/dev/input/by-id/" + device;
  int fd = open(file.c_str(), O_RDONLY);
  if (fd < 0)
  {
    std::cerr << "Failed to open device\n";
    return;
  }

  char dummy[sizeof(struct input_event)];
  while (read(fd, &dummy, sizeof(dummy)) > 0 && !shouldExit)
  {
    // std::cout << "input event" << std::endl;
    std::chrono::time_point<std::chrono::system_clock> now = std::chrono::system_clock::now();
    std::chrono::system_clock::duration duration = now.time_since_epoch();
    long long milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
    lastInputTimeMutex.lock();
    lastInputTime = static_cast<double>(milliseconds);
    lastInputTimeMutex.unlock();
  }

  close(fd);
  std::cout << "exiting thread for device: " << device << std::endl;
}

void CreateHookThread()
{
  std::set<std::string> inputsDevices = GetInputDevices();
  // iterate over all input devices and check if keyboard or mouse
  for (auto it = inputsDevices.begin(); it != inputsDevices.end(); ++it)
  {
    std::string device = *it;
    std::cout << "device: " << device << std::endl;
    // include mouse and keyboard
    bool isMouse = device.find("mouse") != std::string::npos;
    bool isKeyboard = device.find("keyboard") != std::string::npos;
    if (isMouse || isKeyboard)
    {
      threads.push_back(std::thread(watchInputTread, device));
    }
  }
}

void KillThreads()
{
  for (auto it = threads.begin(); it != threads.end(); ++it)
  {
    std::thread &thread = *it;
    if (thread.joinable())
    {
      thread.detach();
    }
  }
}

void destroy()
{
  shouldExit = true;
  KillThreads();
}

void initialize()
{
  char *desktopSession = getenv("DESKTOP_SESSION");
  if (desktopSession != NULL && strcmp(desktopSession, "gnome") == 0)
  {
    isGonome = true;
  }
  if (geteuid() == 0)
    CreateHookThread();
}

void __attribute__((constructor)) initialize();
void __attribute__((destructor)) destroy();

#endif