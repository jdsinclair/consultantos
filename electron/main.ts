import { app, BrowserWindow, ipcMain, desktopCapturer, session } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === "development";
const PORT = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 15, y: 15 },
    icon: path.join(__dirname, "../public/icon.png"),
  });

  // Load the app
  const url = isDev ? `http://localhost:${PORT}` : `http://localhost:${PORT}`;
  mainWindow.loadURL(url);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Handle system audio capture request
ipcMain.handle("get-system-audio-source", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      fetchWindowIcons: false,
    });

    // Return sources so renderer can pick one
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  } catch (error) {
    console.error("Error getting sources:", error);
    return [];
  }
});

// Handle audio capture with system audio
ipcMain.handle("capture-system-audio", async (_, sourceId: string) => {
  // This returns constraints that the renderer can use with getUserMedia
  // The actual capture happens in the renderer process
  return {
    audio: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
        minWidth: 1,
        maxWidth: 1,
        minHeight: 1,
        maxHeight: 1,
      },
    },
  };
});

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const isPackaged = app.isPackaged;

    if (isPackaged) {
      // In production, run the built Next.js app
      const serverPath = path.join(process.resourcesPath, "app");
      nextServer = spawn("node", [path.join(serverPath, ".next/standalone/server.js")], {
        env: {
          ...process.env,
          PORT: String(PORT),
        },
        cwd: serverPath,
      });
    } else {
      // In development, assume Next.js is already running
      resolve();
      return;
    }

    nextServer?.stdout?.on("data", (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes("Ready")) {
        resolve();
      }
    });

    nextServer?.stderr?.on("data", (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer?.on("error", (error) => {
      console.error("Failed to start Next.js server:", error);
      reject(error);
    });

    // Resolve after a timeout if we don't see "Ready"
    setTimeout(resolve, 5000);
  });
}

app.whenReady().then(async () => {
  // Enable media permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ["media", "mediaKeySystem", "geolocation", "notifications"];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Set up display media request handler for system audio
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
      // Allow the request - the user will pick a source in the renderer
      callback({ video: sources[0], audio: "loopback" });
    });
  });

  await startNextServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill();
  }
});
