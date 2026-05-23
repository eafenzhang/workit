import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import updaterPkg from 'electron-updater';
const { autoUpdater } = updaterPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let logPath = '';

function log(msg, err) {
  try {
    if (!logPath) logPath = path.join(app.getPath('userData'), 'workit.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}${err ? ': ' + (err.message || err) : ''}\n`);
  } catch {}
}

process.on('uncaughtException', (err) => {
  log('UNCAUGHT', err);
  try { fs.appendFileSync(logPath, (err.stack || '') + '\n'); } catch {}
  app.exit(1);
});
process.on('unhandledRejection', (err) => { log('UNHANDLED REJECTION', err); });

let mainWindow;
let db = null;

// ========== Database ==========
async function initDatabase() {
  const SQL = await import('sql.js');
  const initSqlJs = SQL.default || SQL;
  const SQLJS = await initSqlJs();
  const dbPath = path.join(app.getPath('userData'), 'workit-data.db');

  if (fs.existsSync(dbPath)) {
    db = new SQLJS.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQLJS.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
    category TEXT DEFAULT '产品', module TEXT DEFAULT '用户端', priority TEXT DEFAULT '中',
    status TEXT DEFAULT '待评估', assignee TEXT DEFAULT '', creator TEXT DEFAULT '',
    due_date TEXT DEFAULT '', tags TEXT DEFAULT '[]', images TEXT DEFAULT '[]',
    ai_summary TEXT DEFAULT '', ai_tags TEXT DEFAULT '[]', image_descriptions TEXT DEFAULT '[]',
    workflow_handler TEXT DEFAULT '', workflow_history TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT DEFAULT 'guide',
    type TEXT DEFAULT 'MD', size TEXT DEFAULT '', views INTEGER DEFAULT 0, stars INTEGER DEFAULT 0,
    date TEXT DEFAULT '', tags TEXT DEFAULT '[]', featured INTEGER DEFAULT 0,
    file_path TEXT DEFAULT '', content TEXT DEFAULT '', image_descriptions TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS mcp_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL,
    command TEXT NOT NULL, args TEXT DEFAULT '[]', env TEXT DEFAULT '{}', enabled INTEGER DEFAULT 0,
    config TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, provider TEXT NOT NULL,
    base_url TEXT DEFAULT '', api_key TEXT DEFAULT '', model_id TEXT NOT NULL,
    enabled INTEGER DEFAULT 0, is_default INTEGER DEFAULT 0, config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // Migrate old status
  db.run("UPDATE requirements SET status = '待评估' WHERE status = '待评审'");
  saveDb();
  log('Database initialized at ' + dbPath);
}

function saveDb() {
  if (!db) return;
  const dbPath = path.join(app.getPath('userData'), 'workit-data.db');
  fs.writeFileSync(dbPath, db.export());
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.get());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ========== IPC Handlers ==========
function setupIPC() {
  ipcMain.handle('window-minimize', () => mainWindow?.minimize());
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize();
  });
  ipcMain.handle('window-close', () => mainWindow?.close());
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() || false);

  ipcMain.handle('db-query', (_, method, table, args) => {
    try {
      const { data, id } = args || {};
      return handleDbQuery(method, table, data, id);
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('db-upload', async (_, table, fileData) => {
    try {
      const uploadsDir = path.join(app.getPath('userData'), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = '.bin';
      const filePath = path.join(uploadsDir, filename + ext);
      fs.writeFileSync(filePath, Buffer.from(fileData));
      const url = `/uploads/${filename}${ext}`;
      return { url };
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('connect-server', (_, url) => {
    if (mainWindow?.webContents) mainWindow.loadURL(url);
    return { success: true };
  });
  ipcMain.handle('disconnect-server', () => {
    if (mainWindow?.webContents) mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
    return { success: true };
  });
}

function handleDbQuery(method, table, data, id) {
  switch (table) {
    case 'requirements':
      return handleRequirements(method, data, id);
    case 'documents':
      return handleDocuments(method, data, id);
    case 'mcp':
      return handleMcp(method, data, id);
    case 'models':
      return handleModels(method, data, id);
    case 'dashboard/stats': {
      const allReq = query('SELECT status FROM requirements');
      const total = allReq.length;
      const statusCounts = {};
      allReq.forEach(r => { const s = r[0] || ''; statusCounts[s] = (statusCounts[s] || 0) + 1; });
      const docCount = query('SELECT COUNT(*) FROM documents')[0][0];
      return { totalRequirements: total, statusCounts, totalDocuments: docCount };
    }
    case 'dashboard/activities': {
      const rows = query("SELECT id, title, status, updated_at FROM requirements ORDER BY updated_at DESC LIMIT 10");
      return rows.map(r => ({ id: r[0], title: r[1], status: r[2], time: r[3] }));
    }
    case 'insights/kpis': {
      const total = query('SELECT COUNT(*) FROM requirements')[0][0];
      const completed = query("SELECT COUNT(*) FROM requirements WHERE status='已完成'")[0][0];
      const docCount = query('SELECT COUNT(*) FROM documents')[0][0];
      return [
        { label: '需求总数', value: String(total), change: '0', up: true },
        { label: '完成率', value: total ? Math.round(completed/total*100) + '%' : '0%', change: '0%', up: true },
        { label: '知识文档', value: String(docCount), change: '0', up: true },
      ];
    }
    case 'insights/charts': {
      const cats = query('SELECT category, COUNT(*) FROM documents GROUP BY category');
      const types = query('SELECT type, COUNT(*) FROM documents GROUP BY type');
      return {
        barData: cats.map(r => ({ name: r[0]||'未分类', value: r[1] })),
        pieData: types.map(r => ({ name: r[0]||'未知', value: r[1] })),
      };
    }
    case 'insights/ai-insights':
      return [];
    case 'storage/stats': {
      try {
        const uploadsDir = path.join(app.getPath('userData'), 'uploads');
        if (!fs.existsSync(uploadsDir)) return { usedBytes: 0 };
        const files = fs.readdirSync(uploadsDir);
        let usedBytes = 0;
        // Only count files referenced by documents
        const docPaths = new Set(query("SELECT file_path FROM documents WHERE file_path != ''").map(r => path.basename(r[0])));
        for (const f of files) { if (docPaths.has(f)) usedBytes += fs.statSync(path.join(uploadsDir, f)).size; }
        return { usedBytes };
      } catch { return { usedBytes: 0 }; }
    }
    default: return { error: 'Unknown table: ' + table };
  }
}

function handleRequirements(method, data, id) {
  switch (method) {
    case 'GET':
      if (id) {
        const r = query('SELECT * FROM requirements WHERE id = ?', [id]);
        if (!r.length) return { error: 'Not found' };
        return formatReq(r[0]);
      }
      const all = query('SELECT * FROM requirements ORDER BY created_at DESC');
      return all.map(formatReq);
    case 'POST': {
      const { title, desc, category, module, priority, assignee, creator, dueDate, tags, images } = data || {};
      run(`INSERT INTO requirements (title, description, category, module, priority, assignee, creator, due_date, tags, images) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [title||'', desc||'', category||'', module||'用户端', priority||'', assignee||'', creator||'', dueDate||'', JSON.stringify(tags||[]), JSON.stringify(images||[])]);
      const id = query('SELECT last_insert_rowid()')[0][0];
      return { success: true, id };
    }
    case 'PUT': {
      if (!id) return { error: 'No id' };
      const { title, desc, category, module, priority, status, assignee, creator, dueDate, tags, images, workflow_handler } = data || {};
      // Workflow history
      let workflowHistory = [];
      try { workflowHistory = JSON.parse(query('SELECT workflow_history FROM requirements WHERE id = ?', [id])[0]?.[0] || '[]'); } catch {}
      if (status) {
        const old = query('SELECT status FROM requirements WHERE id = ?', [id])[0]?.[0];
        if (old && old !== status) workflowHistory.push({ from: old, to: status, handler: workflow_handler || '', time: new Date().toLocaleString('zh-CN') });
      }
      run(`UPDATE requirements SET title=?, description=?, category=?, module=?, priority=?, status=?, assignee=?, creator=?, due_date=?, tags=?, images=?, workflow_history=?, updated_at=datetime('now','localtime') WHERE id=?`,
        [title||'', desc||'', category||'', module||'用户端', priority||'', status||'', assignee||'', creator||'', dueDate||'', JSON.stringify(tags||[]), JSON.stringify(images||[]), JSON.stringify(workflowHistory), id]);
      return { success: true };
    }
    case 'DELETE': {
      if (id) run('DELETE FROM requirements WHERE id = ?', [id]);
      return { success: true };
    }
    default: return { error: 'Unknown method' };
  }
}

function handleDocuments(method, data, id) {
  switch (method) {
    case 'GET':
      if (id) {
        const r = query('SELECT * FROM documents WHERE id = ?', [id]);
        if (!r.length) return { error: 'Not found' };
        run('UPDATE documents SET views = views + 1 WHERE id = ?', [id]);
        return formatDoc(r[0]);
      }
      return query('SELECT id, title, category, type, size, views, stars, date, tags, featured, created_at FROM documents ORDER BY created_at DESC').map(r => ({
        id: r[0], title: r[1], category: r[2], type: r[3], size: r[4], views: r[5], stars: r[6], date: r[7], tags: JSON.parse(r[8] || '[]'), featured: r[9] === 1,
      }));
    case 'POST': {
      const { title, category, type, size, date, tags, featured, content, file_path } = data || {};
      run('INSERT INTO documents (title, category, type, size, date, tags, featured, content, file_path) VALUES (?,?,?,?,?,?,?,?,?)',
        [title||'', category||'guide', type||'MD', size||'', date||'', JSON.stringify(tags||[]), featured ? 1 : 0, content||'', file_path||'']);
      return { success: true, id: query('SELECT last_insert_rowid()')[0][0] };
    }
    case 'PUT': {
      if (!id) return { error: 'No id' };
      const { title, category, type, size, date, tags, featured, content } = data || {};
      run("UPDATE documents SET title=?, category=?, type=?, size=?, date=?, tags=?, featured=?, content=?, updated_at=datetime('now','localtime') WHERE id=?",
        [title||'', category||'', type||'', size||'', date||'', JSON.stringify(tags||[]), featured?1:0, content||'', id]);
      return { success: true };
    }
    case 'DELETE': {
      if (id) run('DELETE FROM documents WHERE id = ?', [id]);
      return { success: true };
    }
    default: return { error: 'Unknown method' };
  }
}

function handleMcp(method, data, id) {
  switch (method) {
    case 'GET':
      return query('SELECT * FROM mcp_servers ORDER BY id DESC').map(r => ({
        id: r[0], name: r[1], type: r[2], command: r[3], args: JSON.parse(r[4]||'[]'), env: JSON.parse(r[5]||'{}'),
        enabled: !!r[6], config: JSON.parse(r[7]||'{}'), createdAt: r[8],
      }));
    case 'POST': {
      const { name, type, command, args, env, config } = data || {};
      run('INSERT INTO mcp_servers (name, type, command, args, env, config) VALUES (?,?,?,?,?,?)',
        [name||'', type||'', command||'', JSON.stringify(args||[]), JSON.stringify(env||{}), JSON.stringify(config||{})]);
      return { success: true };
    }
    case 'PUT': {
      if (!id) return { error: 'No id' };
      const { enabled, config, name, type, command, args, env } = data || {};
      const fields = []; const vals = [];
      if (enabled !== undefined) { fields.push('enabled=?'); vals.push(enabled?1:0); }
      if (config !== undefined) { fields.push('config=?'); vals.push(JSON.stringify(config)); }
      if (name !== undefined) { fields.push('name=?'); vals.push(name); }
      if (type !== undefined) { fields.push('type=?'); vals.push(type); }
      if (command !== undefined) { fields.push('command=?'); vals.push(command); }
      if (args !== undefined) { fields.push('args=?'); vals.push(JSON.stringify(args)); }
      if (env !== undefined) { fields.push('env=?'); vals.push(JSON.stringify(env)); }
      if (fields.length) { vals.push(id); run(`UPDATE mcp_servers SET ${fields.join(',')} WHERE id=?`, vals); }
      return { success: true };
    }
    case 'DELETE': { if (id) run('DELETE FROM mcp_servers WHERE id = ?', [id]); return { success: true }; }
    default: return { error: 'Unknown method' };
  }
}

function handleModels(method, data, id) {
  switch (method) {
    case 'GET':
      return query('SELECT * FROM models ORDER BY is_default DESC, id DESC').map(r => ({
        id: r[0], name: r[1], provider: r[2], baseUrl: r[3], apiKey: r[4] ? '******' + r[4].slice(-4) : '',
        hasApiKey: !!r[4], modelId: r[5], enabled: !!r[6], isDefault: !!r[7], createdAt: r[9],
      }));
    case 'POST': {
      const { name, provider, baseUrl, apiKey, modelId } = data || {};
      const displayName = name || (provider + ' - ' + modelId);
      run('INSERT INTO models (name, provider, base_url, api_key, model_id) VALUES (?,?,?,?,?)',
        [displayName, provider||'', baseUrl||'', apiKey||'', modelId||'']);
      return { success: true, id: query('SELECT last_insert_rowid()')[0][0] };
    }
    case 'PUT': {
      if (!id) return { error: 'No id' };
      const { is_default, apiKey, modelId, name } = data || {};
      if (is_default) run('UPDATE models SET is_default = 0');
      const fields = []; const vals = [];
      if (name !== undefined) { fields.push('name=?'); vals.push(name); }
      if (apiKey !== undefined) { fields.push('api_key=?'); vals.push(apiKey); }
      if (modelId !== undefined) { fields.push('model_id=?'); vals.push(modelId); }
      if (is_default !== undefined) { fields.push('is_default=?'); vals.push(is_default?1:0); }
      if (fields.length) { vals.push(id); run(`UPDATE models SET ${fields.join(',')} WHERE id=?`, vals); }
      return { success: true };
    }
    case 'DELETE': { if (id) run('DELETE FROM models WHERE id = ?', [id]); return { success: true }; }
    default: return { error: 'Unknown method' };
  }
}

function formatReq(r) {
  return {
    id: r[0], title: r[1], desc: r[2], category: r[3], module: r[4]||'用户端', priority: r[5],
    status: r[6], assignee: r[7], creator: r[8], dueDate: r[9], tags: JSON.parse(r[10]||'[]'),
    images: JSON.parse(r[11]||'[]'), aiSummary: r[12]||'', aiTags: JSON.parse(r[13]||'[]'),
    imageDescriptions: JSON.parse(r[14]||'[]'), workflowHandler: r[15]||'',
    workflowHistory: JSON.parse(r[16]||'[]'), createdAt: r[17], updatedAt: r[18],
  };
}

function formatDoc(r) {
  return {
    id: r[0], title: r[1], category: r[2], type: r[3], size: r[4],
    views: r[5]+1, stars: r[6], date: r[7], tags: JSON.parse(r[8]||'[]'),
    featured: r[9]===1, file_path: r[10]||'', content: r[11]||'',
    imageDescriptions: JSON.parse(r[12]||'[]'), createdAt: r[13],
  };
}

function setupWindowEvents(win) {
  win.on('maximize', () => win.webContents?.send('window-maximized-change', true));
  win.on('unmaximize', () => win.webContents?.send('window-maximized-change', false));
}

async function createWindow() {
  log('Creating window...');
  try {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600,
    title: 'Workit',
    icon: path.join(app.getAppPath(), 'public', 'icon.ico'),
    frame: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: true, preload: path.join(app.getAppPath(), 'electron', 'preload.js') },
  });

  setupWindowEvents(mainWindow);
  setupIPC();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });
  log('Window created successfully');
  } catch (e) { log('Window creation failed', e); }
}

app.whenReady().then(async () => {
  log('App ready');
  try {
    await initDatabase();
    setupAutoUpdater();
    return createWindow();
  } catch (e) { log('App ready handler failed', e); }
});

function setupAutoUpdater() {
  if (isDev) return;
  try {
    ipcMain.handle('check-for-update', async () => {
      const r = await autoUpdater.checkForUpdates();
      return { available: r?.updateInfo?.version !== app.getVersion(), version: r?.updateInfo?.version };
    });
    ipcMain.handle('download-update', async () => { await autoUpdater.downloadUpdate(); return true; });
    ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall(); return true; });
    autoUpdater.on('download-progress', (p) => mainWindow?.webContents?.send('update-download-progress', Math.round(p.percent)));
    autoUpdater.on('update-downloaded', () => mainWindow?.webContents?.send('update-ready'));
    autoUpdater.autoDownload = false;
    autoUpdater.setFeedURL({ provider: 'github', repo: 'workit', owner: 'eafenzhang' });
  } catch (e) { log('AutoUpdater init failed', e); }
}

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://') && !url.startsWith('http://localhost')) event.preventDefault();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
