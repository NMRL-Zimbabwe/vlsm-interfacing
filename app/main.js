"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const fs = require("fs");
let win = null;
const args = process.argv.slice(1), serve = args.some(val => val === '--serve');
function createWindow() {
    const electronScreen = electron_1.screen;
    const size = electronScreen.getPrimaryDisplay().workAreaSize;
    const Store = require('electron-store');
    Store.initRenderer();
    // Create the browser window.
    win = new electron_1.BrowserWindow({
        x: 0,
        y: 0,
        fullscreenable: true,
        width: size.width,
        height: size.height,
        webPreferences: {
            nodeIntegration: false,
            allowRunningInsecureContent: (serve) ? true : false,
            contextIsolation: true, // false if you want to run e2e test with Spectron
        },
    });
    if (serve) {
        const debug = require('electron-debug');
        debug();
        require('electron-reloader')(module);
        win.loadURL('http://localhost:4200');
    }
    else {
        // Path when running electron executable
        let pathIndex = './index.html';
        if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
            // Path when running electron in local folder
            pathIndex = '../dist/index.html';
        }
        // win.loadURL(url.format({
        //   pathname: path.join(__dirname, pathIndex),
        //   protocol: 'file:',
        //   slashes: true
        // }));
        const url = new URL(path.join('file:', __dirname, pathIndex));
        win.loadURL(url.href);
    }
    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });
    return win;
}
try {
    const gotTheLock = electron_1.app.requestSingleInstanceLock();
    if (!gotTheLock) {
        electron_1.app.quit();
    }
    else {
        electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            if (win) {
                if (win.isMinimized())
                    win.restore();
                win.focus();
            }
        });
    }
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
    electron_1.app.on('ready', () => setTimeout(createWindow, 400));
    // Quit when all windows are closed.
    electron_1.app.on('window-all-closed', () => {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
    electron_1.app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow();
        }
    });
    electron_1.app.whenReady().then(() => {
        // Register a 'dialog' event listener.
        electron_1.ipcMain.handle('dialog', (event, method, params) => {
            electron_1.dialog[method](params);
        });
    });
}
catch (e) {
    // Catch Error
    // throw e;
}
//# sourceMappingURL=main.js.map