
#include <iostream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <vector>
#include <chrono>
#include <fcntl.h>
#include <map>
#include <cstring>
#include <thread>
#include <mutex>
#include <set>
#include <csignal>
#include <linux/input.h>
#include <sstream>
#include <iomanip>

std::vector<int> clients;
int maxSecondsWithoutConnection = 20;
int maxMsLogFrequency = 100;
double lastConnectionFailedTime = 0;
std::map<std::string, std::vector<int>> rooms;
static double lastInputTime = 0;
std::mutex lastInputTimeMutex;
static bool shouldExit = false;
static double lastLogTime = 0;
std::mutex lastLogTimeMutex;

std::string doubleToString(double value)
{
  std::ostringstream out;
  out << std::fixed << std::setprecision(0) << value;
  std::string str = out.str();
  return str;
}

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

void joinRoom(int client, std::string roomName)
{
  std::string message = "JOIN " + roomName + "\n";
  send(client, message.c_str(), message.length(), 0);
  rooms[roomName].push_back(client);
}

void removeClientRooms(int client)
{
  for (auto &room : rooms)
  {
    for (int i = 0; i < room.second.size(); i++)
    {
      if (room.second[i] == client)
      {
        room.second.erase(room.second.begin() + i);
        break;
      }
    }
  }
}
std::map<std::string, bool> validRoomNames;

bool isValidRoomName(std::string roomName)
{
  if (validRoomNames.find(roomName) != validRoomNames.end())
    return true;
  return false;
}

void sendMessageToRoom(std::string roomName, std::string message)
{
  std::string messageWithTerminator = message + "\n";
  if (rooms.find(roomName) != rooms.end())
  {
    for (int client : rooms[roomName])
    {
      send(client, messageWithTerminator.c_str(), messageWithTerminator.length(), 0);
    }
  }
}

bool isClientConnected(int client)
{
  char buffer[1024] = {0};
  int valread = read(client, buffer, 1024);
  if (valread == 0)
  {
    return false;
  }
  bool isJoin = strncmp(buffer, "JOIN", 4) == 0 && strlen(buffer) > 5;
  if (isJoin)
  {
    std::string bufferStr(buffer);
    std::string roomName = trim(bufferStr.substr(5));
    joinRoom(client, roomName);
  }

  return true;
}

void removeDisconnectedClients()
{
  if (clients.size() == 0)
    return;
  for (int i = 0; i < clients.size(); i++)
  {
    if (!isClientConnected(clients[i]))
    {
      removeClientRooms(clients[i]);
      std::vector<int> id = {clients[i]};
      clients.erase(clients.begin() + i);
    }
  }
}

bool areClientsListening()
{
  bool isListening = false;
  for (int i = 0; i < clients.size(); i++)
  {
    if (isClientConnected(clients[i]))
      return true;
  }
  return false;
}

double getCurrentTime()
{
  std::chrono::time_point<std::chrono::system_clock> now = std::chrono::system_clock::now();
  std::chrono::system_clock::duration duration = now.time_since_epoch();
  long long milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
  return static_cast<double>(milliseconds);
}

bool shouldListen()
{
  bool isListening = areClientsListening();
  double currentTime = getCurrentTime();

  if (!isListening && lastConnectionFailedTime == 0)
    lastConnectionFailedTime = currentTime;

  if (isListening)
    lastConnectionFailedTime = 0;

  double secondsWithoutConnection = (currentTime - lastConnectionFailedTime) / 1000;

  if (!isListening && lastConnectionFailedTime != 0 && secondsWithoutConnection > maxSecondsWithoutConnection)
  {
    return false;
  }

  return true;
}

fd_set set;
struct timeval timeout;

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
    double nowMs = static_cast<double>(std::chrono::duration_cast<std::chrono::milliseconds>(duration).count());
    if (lastInputTime == nowMs)
      continue;
    lastInputTimeMutex.lock();
    lastInputTime = nowMs;
    lastInputTimeMutex.unlock();
    double isRecent = (lastLogTime + maxMsLogFrequency) > nowMs;
    if (lastLogTime != 0 && isRecent)
    {
      std::this_thread::sleep_for(std::chrono::milliseconds(10));
      continue;
    }

    std::cout << "last Log : " << nowMs - lastLogTime << "ms" << std::endl;
    lastLogTimeMutex.lock();
    lastLogTime = nowMs;
    lastLogTimeMutex.unlock();
    sendMessageToRoom("last-inputs-time", doubleToString(lastInputTime));
  }

  close(fd);
  std::cout << "exiting thread for device: " << device << std::endl;
}

void CreateHookThreads()
{
  std::set<std::string> inputsDevices = GetInputDevices();
  // iterate over all input devices and check if keyboard or mouse
  for (auto it = inputsDevices.begin(); it != inputsDevices.end(); ++it)
  {
    std::string device = *it;

    // include mouse and keyboard
    bool isMouse = device.find("mouse") != std::string::npos;
    bool isKeyboard = device.find("kbd") != std::string::npos;
    if (isMouse || isKeyboard)
    {
      std::cout << "Device Hooked: " << device << std::endl;
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

void initializeHooks()
{
  if (geteuid() == 0)
    CreateHookThreads();
}

void signalHandler(int signum)
{
  std::cout << "Interrupt signal (" << signum << ") received.\n";
  destroy();
  exit(signum);
}

void registerSignals()
{
  signal(SIGINT, signalHandler);
  signal(SIGTERM, signalHandler);
  signal(SIGKILL, signalHandler);
  signal(SIGQUIT, signalHandler);
}

int main()
{
  validRoomNames["last-inputs-time"] = true;

  registerSignals();
  initializeHooks();

  int server_fd, new_socket;
  struct sockaddr_in address;
  int opt = 1;
  int addrlen = sizeof(address);

  // Creating socket file descriptor
  if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0)
  {
    perror("socket failed");
    exit(EXIT_FAILURE);
  }

  if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR | SO_REUSEPORT, &opt, sizeof(opt)))
  {
    perror("setsockopt");
    exit(EXIT_FAILURE);
  }
  address.sin_family = AF_INET;
  address.sin_addr.s_addr = inet_addr("127.0.0.1");
  address.sin_port = htons(9808);

  if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0)
  {
    perror("bind failed");
    exit(EXIT_FAILURE);
  }
  if (listen(server_fd, 3) < 0)
  {
    perror("listen");
    exit(EXIT_FAILURE);
  }
  std::cout << "Server is running on port 9808" << std::endl;
  // Make the socket non-blocking
  int flags = fcntl(server_fd, F_GETFL, 0);
  fcntl(server_fd, F_SETFL, flags | O_NONBLOCK);

  do
  {
    FD_ZERO(&set);
    FD_SET(server_fd, &set);
    timeout.tv_sec = 0;
    timeout.tv_usec = 100000; // 100ms

    int rv = select(server_fd + 1, &set, NULL, NULL, &timeout);
    if (rv == -1)
    {
      perror("select"); // error occurred in select()
      continue;
    }
    else if (rv == 0)
      continue;

    int new_socket = accept(server_fd, (struct sockaddr *)&address, (socklen_t *)&addrlen);
    if (new_socket < 0)
    {
      perror("accept");
      continue;
    }
    clients.push_back(new_socket);
    removeDisconnectedClients();
  } while (shouldListen());
  destroy();
  return 0;
}