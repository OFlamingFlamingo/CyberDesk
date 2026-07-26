const { ipcRenderer } = require('electron');
const path = require('path');

const bootLines = [
  '> INITIALIZING CYBERDESK TERMINAL...',
  '> LOADING SHELL BRIDGE............ OK',
  '> MOUNTING FILESYSTEM............. OK',
  '> READING TELEMETRY............... OK',
  '> STARTING PROGRAM................ OK',
  '> READY.'
];

const bootTextEl = document.getElementById('boot-text');
let bootIndex = 0;

function typeBootLine() {
  if (bootIndex >= bootLines.length) {
    setTimeout(() => {
      document.getElementById('boot-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      startApp();
    }, 300);
    return;
  }
  bootTextEl.textContent += bootLines[bootIndex] + '\n';
  bootIndex++;
  setTimeout(typeBootLine, 160);
}
typeBootLine();

function startApp() {
  startClock();
  startStats();
  startFileBrowser();
  startSidebarTabs();
  startSidebarToggle();
  startQuickActions();
  startTerminals();
}

function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString();

    const edexClock = document.getElementById('edex-clock');
    if (edexClock) {
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      edexClock.textContent = `${hh} : ${mm} : ${ss}`;

      document.getElementById('edex-year').textContent = now.getFullYear();
      const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      document.getElementById('edex-date').textContent = `${months[now.getMonth()]} ${String(now.getDate()).padStart(2, '0')}`;
    }

    document.getElementById('datestamp').textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
  tick();
  setInterval(tick, 1000);
}

function startSidebarTabs() {
  const tabs = document.querySelectorAll('.sidebar-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('panel-' + tab.dataset.panel).classList.remove('hidden');
    });
  });
}

function startSidebarToggle() {
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    setTimeout(() => fitActiveTerminal(), 200);
  });
}

let coreHistories = [];
const MAX_HISTORY = 40;

function drawCpuGraphs(cpus) {
  const container = document.getElementById('cpu-graphs-container');
  if (!container) return;

  if (coreHistories.length === 0 && cpus.length > 0) {
    container.innerHTML = '';
    cpus.forEach(() => coreHistories.push([]));

    const numGraphs = cpus.length > 6 ? 2 : 1;
    const coresPerGraph = Math.ceil(cpus.length / numGraphs);

    for (let g = 0; g < numGraphs; g++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'edex-flex-between border-bottom';
      wrapper.style.paddingBottom = '10px';
      wrapper.style.marginBottom = '10px';
      wrapper.style.alignItems = 'center';

      const startNum = g * coresPerGraph + 1;
      const endNum = Math.min((g + 1) * coresPerGraph, cpus.length);

      const labelDiv = document.createElement('div');
      labelDiv.innerHTML = `<div class="lbl"># ${startNum} - ${endNum}</div><div class="val-sm" style="color:gray;" id="avg-cpu-${g}">Avg. 0%</div>`;

      const canvas = document.createElement('canvas');
      canvas.id = `cpu-canvas-${g}`;
      canvas.width = 200;
      canvas.height = 40;

      wrapper.appendChild(labelDiv);
      wrapper.appendChild(canvas);
      container.appendChild(wrapper);
    }
  }

  cpus.forEach((core, i) => {
    if (!coreHistories[i]) coreHistories[i] = [];
    coreHistories[i].push(core.load);
    if (coreHistories[i].length > MAX_HISTORY) coreHistories[i].shift();
  });

  const numGraphs = cpus.length > 6 ? 2 : 1;
  const coresPerGraph = Math.ceil(cpus.length / numGraphs);

  for (let g = 0; g < numGraphs; g++) {
    const canvas = document.getElementById(`cpu-canvas-${g}`);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let totalLoad = 0;
    let count = 0;

    const startCore = g * coresPerGraph;
    const endCore = Math.min(startCore + coresPerGraph, cpus.length);

    for (let c = startCore; c < endCore; c++) {
      const hist = coreHistories[c];
      if (hist && hist.length > 0) totalLoad += hist[hist.length-1];
      count++;

      ctx.strokeStyle = `rgba(57, 255, 20, ${0.4 + (c % 3) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (hist) {
        hist.forEach((val, i) => {
          const x = (i / MAX_HISTORY) * canvas.width;
          const y = canvas.height - (val / 100) * canvas.height;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
      }
      ctx.stroke();
    }
    const avgEl = document.getElementById(`avg-cpu-${g}`);
    if (avgEl) avgEl.textContent = `Avg. ${Math.round(totalLoad / (count || 1))}%`;
  }
}

const MEM_COLS = 50;
const MEM_ROWS = 6;
const TOTAL_MEM_DOTS = MEM_COLS * MEM_ROWS;
const memIndices = Array.from({length: TOTAL_MEM_DOTS}, (_, i) => i);
for (let i = memIndices.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [memIndices[i], memIndices[j]] = [memIndices[j], memIndices[i]];
}

function drawMemoryMatrix(used, total) {
  const canvas = document.getElementById('mem-matrix');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const percent = used / total;
  const usedDots = Math.floor(percent * TOTAL_MEM_DOTS);

  const dotW = canvas.width / MEM_COLS;
  const dotH = canvas.height / MEM_ROWS;

  const activeIndices = new Set(memIndices.slice(0, usedDots));

  let dotCount = 0;
  for (let y = 0; y < MEM_ROWS; y++) {
    for (let x = 0; x < MEM_COLS; x++) {
      ctx.fillStyle = activeIndices.has(dotCount) ? '#39ff14' : 'rgba(57, 255, 20, 0.15)';
      ctx.fillRect(x * dotW + 1, y * dotH + 1, dotW - 2, dotH - 2);
      dotCount++;
    }
  }
}

async function refreshStats() {
  const s = await ipcRenderer.invoke('get-stats');
  if (!s) return;

  const hostEl = document.getElementById('hostinfo');
  if (hostEl) hostEl.textContent = `${s.osInfo.hostname} · ${s.osInfo.platform}/${s.osInfo.arch}`;

  const d = Math.floor(s.time.uptime / 86400);
  const h = Math.floor((s.time.uptime % 86400) / 3600);
  const m = Math.floor((s.time.uptime % 3600) / 60);

  const uptimeEl = document.getElementById('edex-uptime');
  if (uptimeEl) uptimeEl.textContent = `${d}d${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

  const typeEl = document.getElementById('edex-type');
  if (typeEl) typeEl.textContent = s.osInfo.platform.substring(0,3);

  const mfgEl = document.getElementById('edex-mfg');
  if (mfgEl) mfgEl.textContent = s.system.manufacturer || 'Unknown';

  const modelEl = document.getElementById('edex-model');
  if (modelEl) modelEl.textContent = s.system.model || 'Unknown';

  const chassisEl = document.getElementById('edex-chassis');
  if (chassisEl) chassisEl.textContent = s.chassis.type || 'Desktop';

  const cpuNameEl = document.getElementById('edex-cpu-name');
  if (cpuNameEl) cpuNameEl.textContent = s.cpu.brand || 'Unknown CPU';

  const coresEl = document.getElementById('edex-cores');
  if (coresEl) coresEl.textContent = s.cpu.physicalCores || s.cpu.cores;

  const spdEl = document.getElementById('edex-spd');
  if (spdEl) spdEl.textContent = (s.cpu.speed || 0) + 'GHz';

  const maxEl = document.getElementById('edex-max');
  if (maxEl) maxEl.textContent = (s.cpu.speedMax || 0) + 'GHz';

  const tasksEl = document.getElementById('edex-tasks');
  if (tasksEl) tasksEl.textContent = s.procsAll || '--';

  const totalGib = (s.mem.total / 1073741824).toFixed(1);
  const usedGib = (s.mem.active / 1073741824).toFixed(1);

  const memTextEl = document.getElementById('edex-mem-text');
  if (memTextEl) memTextEl.textContent = `USING ${usedGib} OUT OF ${totalGib} GiB`;
  drawMemoryMatrix(s.mem.active, s.mem.total);

  const swapTotal = s.mem.swaptotal / 1073741824;
  const swapUsed = s.mem.swapused / 1073741824;

  const swapTextEl = document.getElementById('edex-swap-text');
  if (swapTextEl) swapTextEl.textContent = `${swapUsed.toFixed(1)} GiB`;

  const swapBarEl = document.getElementById('edex-swap-bar');
  if (swapBarEl) swapBarEl.style.width = swapTotal > 0 ? `${(swapUsed / swapTotal) * 100}%` : '0%';

  if (s.currentLoad && s.currentLoad.cpus) {
    drawCpuGraphs(s.currentLoad.cpus);
  }

  if (s.procsList) {
    const procContainer = document.getElementById('edex-procs');
    if (procContainer) {
      procContainer.innerHTML = '';
      s.procsList.forEach(p => {
        const row = document.createElement('div');
        row.className = 'proc-row';
        row.innerHTML = `
          <div class="val-sm" style="color:gray;">${p.pid}</div>
          <div class="val-sm">${p.name}</div>
          <div class="val-sm" style="text-align:right;">${(p.cpu || 0).toFixed(1)}%</div>
          <div class="val-sm" style="text-align:right;">${(p.mem || 0).toFixed(1)}%</div>
        `;
        procContainer.appendChild(row);
      });
    }
  }
}

function startStats() {
  refreshStats();
  setInterval(refreshStats, 2000);
}

async function loadDir(dirPath) {
  const result = await ipcRenderer.invoke('list-dir', dirPath);
  const pathEl = document.getElementById('file-path');
  if (pathEl) pathEl.textContent = result.path;

  const listEl = document.getElementById('file-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const upEntry = document.createElement('div');
  upEntry.className = 'file-entry dir';
  upEntry.textContent = '..';
  upEntry.onclick = () => loadDir(result.parent);
  listEl.appendChild(upEntry);

  if (result.entries) {
    result.entries.forEach(entry => {
      const el = document.createElement('div');
      el.className = 'file-entry ' + (entry.isDir ? 'dir' : 'file');
      el.textContent = entry.name;

      const fullPath = path.join(result.path, entry.name);

      if (entry.isDir) {
        el.onclick = () => loadDir(fullPath);
      } else {
        el.onclick = () => ipcRenderer.send('open-file', fullPath);
      }

      listEl.appendChild(el);
    });
  }
}

function startFileBrowser() {
  loadDir(null);
}

const QUICK_ACTIONS = [
  { label: 'clear', cmd: 'clear' },
  { label: 'ls', cmd: 'ls' },
  { label: 'git status', cmd: 'git status' },
  { label: 'git log', cmd: 'git log --oneline -10' },
  { label: 'npm install', cmd: 'npm install' },
  { label: 'pwd', cmd: 'pwd' }
];

function startQuickActions() {
  const bar = document.getElementById('quick-actions');
  if (!bar) return;
  QUICK_ACTIONS.forEach(action => {
    const btn = document.createElement('button');
    btn.className = 'quick-action-btn';
    btn.textContent = action.label;
    btn.onclick = () => runQuickAction(action);
    bar.appendChild(btn);
  });
}

function runQuickAction(action) {
  sendToActiveTerminal(action.cmd + '\r');
}

const sessions = new Map();
let activeId = null;
let tabCounter = 0;

function sendToActiveTerminal(text) {
  if (activeId == null) return;
  ipcRenderer.send('term-input', { id: activeId, input: text });
}

function fitActiveTerminal() {
  const session = sessions.get(activeId);
  if (session) {
    try {
      session.fitAddon.fit();
      ipcRenderer.send('term-resize', { id: activeId, cols: session.term.cols, rows: session.term.rows });
    } catch (e) {}
  }
}

function createTerminalSession() {
  const id = ++tabCounter;
  const container = document.getElementById('terminal-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'term-instance';
  el.id = 'term-instance-' + id;
  container.appendChild(el);

  const term = new Terminal({
    theme: {
      background: '#000000',
      foreground: '#39ff14',
      cursor: '#39ff14',
      selectionBackground: '#1f5c1f80',
      black: '#000000',
      red: '#ff5c5c',
      green: '#39ff14',
      yellow: '#d4d418',
      blue: '#5c9eff',
      magenta: '#ff79c6',
      cyan: '#39d6c9',
      white: '#c9c9c9',
      brightBlack: '#4d4d4d',
      brightRed: '#ff8080',
      brightGreen: '#7dff5c',
      brightYellow: '#eaea5c',
      brightBlue: '#82b8ff',
      brightMagenta: '#ff9edb',
      brightCyan: '#6cf5e8',
      brightWhite: '#f4f4f4'
    },
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 13,
    cursorBlink: true
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(el);
  fitAddon.fit();

  ipcRenderer.send('term-start', id);
  term.onData(data => ipcRenderer.send('term-input', { id, input: data }));
  ipcRenderer.send('term-resize', { id, cols: term.cols, rows: term.rows });

  sessions.set(id, { term, fitAddon, el });

  const tabList = document.getElementById('tab-list');
  if (tabList) {
    const tab = document.createElement('div');
    tab.className = 'term-tab';
    tab.dataset.id = id;
    const label = document.createElement('span');
    label.textContent = 'Session ' + id;
    const closeX = document.createElement('span');
    closeX.className = 'close-x';
    closeX.textContent = '×';
    closeX.onclick = (e) => { e.stopPropagation(); closeTerminalSession(id); };
    tab.appendChild(label);
    tab.appendChild(closeX);
    tab.onclick = () => setActiveTerminal(id);
    tabList.appendChild(tab);
  }

  setActiveTerminal(id);
  return id;
}

function setActiveTerminal(id) {
  activeId = id;
  document.querySelectorAll('.term-tab').forEach(t => {
    t.classList.toggle('active', Number(t.dataset.id) === id);
  });
  sessions.forEach((session, sid) => {
    session.el.style.display = (sid === id) ? 'block' : 'none';
  });
  const session = sessions.get(id);
  if (session) {
    setTimeout(() => {
      session.fitAddon.fit();
      ipcRenderer.send('term-resize', { id, cols: session.term.cols, rows: session.term.rows });
      session.term.focus();
    }, 0);
  }
  const statusLeft = document.getElementById('status-left');
  if (statusLeft) statusLeft.textContent = 'Session ' + id + ' active';
}

function closeTerminalSession(id) {
  const session = sessions.get(id);
  if (!session) return;
  ipcRenderer.send('term-close', id);
  session.term.dispose();
  session.el.remove();
  const tabEl = document.querySelector(`.term-tab[data-id="${id}"]`);
  if (tabEl) tabEl.remove();
  sessions.delete(id);

  if (activeId === id) {
    const remaining = Array.from(sessions.keys());
    if (remaining.length > 0) {
      setActiveTerminal(remaining[remaining.length - 1]);
    } else {
      createTerminalSession();
    }
  }
}

function startTerminals() {
  ipcRenderer.on('term-data', (event, { id, data }) => {
    const session = sessions.get(id);
    if (session) session.term.write(data);
  });

  const newTabBtn = document.getElementById('new-tab-btn');
  if (newTabBtn) {
    newTabBtn.addEventListener('click', () => createTerminalSession());
  }

  createTerminalSession();
  window.addEventListener('resize', () => fitActiveTerminal());
}
