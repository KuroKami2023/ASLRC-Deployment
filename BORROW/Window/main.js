const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { exec } = require('child_process');
const Swal = require('sweetalert2');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile('./Frontend/index.html');
  mainWindow.maximize();
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('runExe', () => {
    mainWindow.hide();

    const executablePath = path.join(__dirname, '../Backend/Borrow/zk4500.exe');
    const executableDir = path.join(__dirname, '../Backend/Borrow');
    const command = `"${executablePath}"`;

    exec(command, { cwd: executableDir }, (error, stdout, stderr) => {
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
  });

  ipcMain.on('runExe2', () => {
    mainWindow.hide();

    const executablePath = path.join(__dirname, '../Backend/Return/zk4500.exe');
    const executableDir = path.join(__dirname, '../Backend/Return');
    const command = `"${executablePath}"`;

    exec(command, { cwd: executableDir }, (error, stdout, stderr) => {
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
  });

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
