#include <windows.h>
#include <iostream>
#include <chrono>
#include <thread>

int main()
{
  HINSTANCE hGetProcIDDLL = LoadLibrary("./chrolog.dll");

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

  // free the DLL module
  FreeLibrary(hGetProcIDDLL);
  return EXIT_SUCCESS;
}