# Chrolog - Your Open-Source Time Tracking Tool

Chrolog is a time tracking software. It tracks time by recognizing keyboard and mouse actions, and records how long you spend on each project.  
With the Chrome extension [Chrolog - TabTracker](https://chromewebstore.google.com/detail/chrolog-tabtracker/kcfeanjmngaljpdfnojiijemmfmdlapf) , you can choose which websites to exclude from tracking.

Visit the [release page](https://github.com/Lukylix/Chrolog/releases) to download binary files.

# :desktop_computer: Screenshots

<img src="./ProjectDetails.png" alt="Project Details page" style="width: 300px;">
<img src="./Home.png" alt="Home page" style="width: 300px;">

# :eyes: Privacy

- **Offline Usage**:  
  Chrolog tracks keyboard and mouse activity locally, ensuring that none of your data is transmitted or stored online.

- **No Parsing**:  
  Your inputs are tracked without content parsing, preserving the privacy of your keystrokes and mouse movements.

# :man_technologist: Development Guidelines

## Ideal IDE Setup

- [VSCode](https://code.visualstudio.com/)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## How to Set Up the Project

#### For windows :

Ensure that you have the Build Tools for [Microsoft Visual Studio 2022](https://visualstudio.microsoft.com/downloads/) installed.  
(Tools for Visual Studio --> Build Tools for Visual Studio 2022)

if you want to recompile the cpp files install [gcc](https://code.visualstudio.com/docs/cpp/config-mingw#_prerequisites) for Visual Studio code.

In Visual Studio Code :  
`ctrl`+`shift`+`B` To run the chrolog.dll build (build-lib-win).
or  
Execute command -> Task: run task -> build-lib-win.

Then build the electron app.

```bash
yarn
yarn m-postinstall
```

Then you can type `yarn dev` or `yarn build:win`.

#### For linux

Ensure that you have the build-essential to compile the lib and the input server.

```bash
sudo apt-get update
sudo apt-get install build-essential
```

In Visual Studio Code :  
`ctrl`+`shift`+`B` To run the chrolog.so and chrolog-server build (build-lib-linux) .
or  
Execute command -> Task: run task -> build-lib-linux.

```bash
yarn
yarn m-postinstall
```

Then you can type `yarn dev` or `yarn build:linux`.
