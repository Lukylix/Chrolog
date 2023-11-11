#ifdef _WIN32
#include <windows.h>
#include <iostream>
#include <chrono>
#include <thread>

int main()
{
  HINSTANCE hGetProcIDDLL = LoadLibrary("../../resources/chrolog.dll");

  if (!hGetProcIDDLL)
  {
    std::cout << "could not load the dynamic library" << std::endl;
    return EXIT_FAILURE;
  }

  typedef const char *(*GetActiveAppPointer)();
  GetActiveAppPointer GetActiveApp = reinterpret_cast<GetActiveAppPointer>(GetProcAddress(hGetProcIDDLL, "GetActiveApp"));
  typedef bool (*EnumWindowsProcessIdsPointer)();
  EnumWindowsProcessIdsPointer EnumWindowsProcessIds = reinterpret_cast<EnumWindowsProcessIdsPointer>(GetProcAddress(hGetProcIDDLL, "EnumWindowsProcessIds"));
  typedef int (*GetNextProcessIdPointer)();
  GetNextProcessIdPointer GetNextProcessId = reinterpret_cast<GetNextProcessIdPointer>(GetProcAddress(hGetProcIDDLL, "GetNextProcessId"));
  typedef char **(*GetProcessInfosPointer)(int pid);
  GetProcessInfosPointer GetProcessInfos = reinterpret_cast<GetProcessInfosPointer>(GetProcAddress(hGetProcIDDLL, "GetProcessInfos"));
  typedef int (*GetLastInputTimePointer)();
  GetLastInputTimePointer GetLastInputTime = reinterpret_cast<GetLastInputTimePointer>(GetProcAddress(hGetProcIDDLL, "GetLastInputTime"));

  std::string activeApp = GetActiveApp();
  std::cout << activeApp << std::endl;

  bool enumWindowsProcessIdsSuccess = EnumWindowsProcessIds();
  if (!enumWindowsProcessIdsSuccess)
    return EXIT_FAILURE;
  std::cout << "Enum sucess!" << std::endl;

  int id = -1;
  int firstid = 0;
  do
  {
    id = GetNextProcessId();
    std::cout << id << std::endl;
    if (firstid == 0)
      firstid = id;
  } while (id > 0);

  char **processInfos = GetProcessInfos(firstid);
  std::cout << processInfos[0] << std::endl;

  for (int i = 0; i < 5; i++)
  {
    double lastInputTime = GetLastInputTime();
    std::cout << lastInputTime << std::endl;
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
  }

  std::cout << "Milliseconds since epoch: " << milliseconds << '\n';
  return 0;
  // free the DLL module
  FreeLibrary(hGetProcIDDLL);
  return EXIT_SUCCESS;
}

#endif

#ifdef linux
#include <dlfcn.h>
#include <iostream>
#include <chrono>
#include <thread>
#include <filesystem>
#include <limits.h>
#include <unistd.h>

std::string get_selfpath()
{
  char buff[PATH_MAX];
  ssize_t len = ::readlink("/proc/self/exe", buff, sizeof(buff) - 1);
  if (len != -1)
  {
    buff[len] = '\0';
    return std::string(buff);
  }

  return "";
}

int main()
{
  auto currentProcessPath = get_selfpath();
  std::cout << currentProcessPath << std::endl;
  auto dllPath = std::filesystem::path(currentProcessPath).parent_path().parent_path().parent_path().append("resources/chrolog.so");
  const char *dllPathStr = dllPath.c_str();
  void *handle = dlopen(dllPathStr, RTLD_LAZY);
  if (!handle)
  {
    std::cerr << "Cannot open library: " << dlerror() << '\n';
    return EXIT_FAILURE;
  }

  typedef const char *(*GetActiveAppPointer)();
  GetActiveAppPointer GetActiveApp = reinterpret_cast<GetActiveAppPointer>(dlsym(handle, "GetActiveApp"));
  typedef bool (*EnumWindowsProcessIdsPointer)();
  EnumWindowsProcessIdsPointer EnumWindowsProcessIds = reinterpret_cast<EnumWindowsProcessIdsPointer>(dlsym(handle, "EnumWindowsProcessIds"));
  typedef int (*GetNextProcessIdPointer)();
  GetNextProcessIdPointer GetNextProcessId = reinterpret_cast<GetNextProcessIdPointer>(dlsym(handle, "GetNextProcessId"));
  typedef char **(*GetProcessInfosPointer)(int pid);
  GetProcessInfosPointer GetProcessInfos = reinterpret_cast<GetProcessInfosPointer>(dlsym(handle, "GetProcessInfos"));
  typedef double (*GetLastInputTimePointer)();
  GetLastInputTimePointer GetLastInputTime = reinterpret_cast<GetLastInputTimePointer>(dlsym(handle, "GetLastInputTime"));

  const char *activeApp = GetActiveApp();

  std::cout << activeApp << std::endl;

  bool enumWindowsProcessIdsSuccess = EnumWindowsProcessIds();
  if (!enumWindowsProcessIdsSuccess)
    return EXIT_FAILURE;
  std::cout << "Enum sucess!" << std::endl;

  int id = -1;
  int firstid = 0;
  do
  {
    id = GetNextProcessId();
    if (firstid == 0)
      firstid = id;
  } while (id > 0);

  std::cout << firstid << std::endl;

  char **processInfos = GetProcessInfos(firstid);
  std::cout << processInfos[0] << std::endl;
  std::cout << processInfos[1] << std::endl;

  for (int i = 0; i < 5; i++)
  {
    double lastInputTime = GetLastInputTime();
    std::cout << lastInputTime << std::endl;
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
  }

  // dlclose(handle);
  return EXIT_SUCCESS;
}

#endif