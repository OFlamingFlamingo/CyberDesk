const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pty = require('node-pty');
const si = require('systeminformation');

let mainWindow;
const terminals = new Map(); // id -> pty process

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1100,
    backgroundColor: '#000000',
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    terminals.forEach(proc => proc.kill());
    terminals.clear();
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---------- System stats (eDEX style) ----------
ipcMain.handle('get-stats', async () => {
  try {
    const [time, osInfo, system, chassis, cpu, currentLoad, mem, processes] = await Promise.all([
      si.time(),
      si.osInfo(),
      si.system(),
      si.chassis(),
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.processes()
    ]);

    // Aggressively filter out Windows pseudo-processes (Idle and System) and force number sorting
    const activeProcs = processes.list
        .filter(p => p.pid != 0 && p.pid != 4 && !p.name.toLowerCase().includes('idle'))
        .sort((a, b) => (parseFloat(b.cpu) || 0) - (parseFloat(a.cpu) || 0));

    return {
      time, osInfo, system, chassis, cpu, currentLoad, mem,
      procsAll: processes.all,
      procsList: activeProcs.slice(0, 6) // Top 6 active processes
    };
  } catch (e) {
    return null;
  }
});

// ---------- File browser ----------
ipcMain.handle('list-dir', (event, dirPath) => {
  const target = dirPath || os.homedir();
  try {
    const entries = fs.readdirSync(target, { withFileTypes: true });
    return {
      path: target,
      parent: path.dirname(target),
      entries: entries.map(e => ({
        name: e.name,
        isDir: e.isDirectory()
      })).sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name))
    };
  } catch (err) {
    return { path: target, parent: path.dirname(target), entries: [], error: err.message };
  }
});

// ADD THIS NEW HANDLER:
ipcMain.on('open-file', (event, filePath) => {
  shell.openPath(filePath);
});

// ---------- Terminal (multi-session, real PTY) ----------
ipcMain.on('term-start', (event, id) => {
  const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: os.homedir(),
    env: process.env
  });
  terminals.set(id, ptyProcess);

  ptyProcess.onData((data) => {
    event.sender.send('term-data', { id, data });
  });
  ptyProcess.onExit(() => {
    event.sender.send('term-data', { id, data: '\r\n[process exited]\r\n' });
    terminals.delete(id);
  });
});

ipcMain.on('term-input', (event, { id, input }) => {
  const proc = terminals.get(id);
  if (proc) proc.write(input);
});

ipcMain.on('term-resize', (event, { id, cols, rows }) => {
  const proc = terminals.get(id);
  if (proc && cols > 0 && rows > 0) {
    try { proc.resize(cols, rows); } catch (e) {}
  }
});

ipcMain.on('term-close', (event, id) => {
  const proc = terminals.get(id);
  if (proc) proc.kill();
  terminals.delete(id);
});