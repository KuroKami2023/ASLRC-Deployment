const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { exec } = require('child_process');
const Swal = require('sweetalert2');

let mainWindow;
let childProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile('./Frontend/index.html');

  runExe();
}

function runExe() {
  mainWindow.hide();

  const executablePath = path.join(__dirname, '../Backend/Record/zk4500.exe');
  const executableDir = path.join(__dirname, '../Backend/Record');
  const command = `"${executablePath}"`;

  childProcess = exec(command, { cwd: executableDir }, (error, stdout, stderr) => {
    mainWindow.show();

    if (error) {
      console.error(`Error executing the command: ${error.message}`);
      console.error(`stderr: ${stderr}`);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: `Error executing the command: ${error.message}`,
      });
    } else {
      console.log('Command executed successfully');
      console.log(`stdout: ${stdout}`);
    }
  });

  // Listen for the exit event of the child process
  childProcess.on('exit', (code, signal) => {
    // Child process has exited, close the Electron app
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('runExe', runExe);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
