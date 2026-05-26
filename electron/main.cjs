const { app, BrowserWindow, shell, ipcMain, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const updaterPkg = require('electron-updater');
const { autoUpdater } = updaterPkg;

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
const preloadPath = path.join(app.getAppPath(), 'electron', 'preload.cjs');

// ========== Database ==========
async function initDatabase() {
  const sqlJsInit = require('sql.js');
  const SQL = await sqlJsInit();
  const dbPath = path.join(app.getPath('userData'), 'workit-data.db');

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
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
  log('initDatabase: success, path=' + dbPath);
}

function saveDb() {
  if (!db) return;
  try {
    const dbPath = path.join(app.getPath('userData'), 'workit-data.db');
    fs.writeFileSync(dbPath, db.export());
  } catch (e) {
    log('saveDb FAILED (disk write error — data still in memory)', e);
  }
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
  saveDb(); // best-effort: failure is logged but does not propagate
}

function getDefaultModel() {
  const rows = query('SELECT * FROM models WHERE enabled = 1 AND is_default = 1 LIMIT 1');
  if (!rows.length) {
    const any = query('SELECT * FROM models WHERE enabled = 1 LIMIT 1');
    if (!any.length) {
      const all = query('SELECT * FROM models');
      log('getDefaultModel: no enabled model found. Total models: ' + all.length);
      return null;
    }
    log('getDefaultModel: using first enabled model: ' + any[0][1]);
    return { baseUrl: any[0][3], apiKey: any[0][4], modelId: any[0][5] };
  }
  log('getDefaultModel: using default model: ' + rows[0][1]);
  return { baseUrl: rows[0][3], apiKey: rows[0][4], modelId: rows[0][5] };
}

async function callAI(prompt) {
  const model = getDefaultModel();
  if (!model || !model.apiKey) return null;
  // Detect API style from baseUrl
  const isAnthropic = model.baseUrl.includes('anthropic');
  let url = model.baseUrl.replace(/\/+$/, '');
  if (isAnthropic) {
    url += '/v1/messages';
  } else {
    url += '/v1/chat/completions';
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + model.apiKey },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300, temperature: 0.7,
      }),
    });
    const data = await res.json();
    log('AI call response status=' + res.status + ' body=' + JSON.stringify(data).substring(0, 300));
    // OpenAI format: { choices: [{ message: { content: "..." } }] }
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    // Anthropic/Minimax format: { content: [{ type: "thinking", thinking: "..." }, { type: "text", text: "..." }] }
    if (data.content && Array.isArray(data.content)) {
      const textBlock = data.content.find((c) => c.type === 'text');
      if (textBlock?.text) return textBlock.text.trim();
    }
    log('AI call unexpected response format: ' + JSON.stringify(data).substring(0, 200));
    return null;
  } catch (e) {
    log('AI call failed', e);
    return null;
  }
}

// ========== IPC Handlers ==========
function setupIPC() {
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('window-minimize', () => mainWindow?.minimize());
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize();
  });
  ipcMain.handle('window-close', () => mainWindow?.close());
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() || false);

  ipcMain.handle('db-query', async (_, method, table, args) => {
    try {
      const { data, id } = args || {};
      const result = await handleDbQuery(method, table, data, id);
      const rtype = Array.isArray(result) ? 'array[' + result.length + ']' : (typeof result) + '/' + Object.keys(result||{}).slice(0,3).join(',');
      const extra = (result && result.id !== undefined) ? ' id=' + result.id : '';
      log('db-query: ' + method + ' ' + table + ' → ' + rtype + extra);
      return result;
    } catch (e) { log('db-query ERROR', e); return { error: e.message }; }
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
}

async function handleDbQuery(method, table, data, id) {
  table = String(table || '').split('?')[0];
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
      const total = query('SELECT COUNT(*) FROM requirements')[0][0];
      const completed = query("SELECT COUNT(*) FROM requirements WHERE status='已完成'")[0][0];
      const inProgress = query("SELECT COUNT(*) FROM requirements WHERE status='实现中'")[0][0];
      const docCount = query('SELECT COUNT(*) FROM documents')[0][0];
      return [
        { label: '需求总数', value: String(total), change: '+' + total, icon: 'SparklesIcon', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
        { label: '完成率', value: total ? Math.round(completed/total*100) + '%' : '0%', change: completed + ' 已完成', icon: 'CheckCircleIcon', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        { label: '进行中', value: String(inProgress), change: inProgress + ' 项', icon: 'ZapIcon', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        { label: '知识文档', value: String(docCount), change: docCount + ' 篇', icon: 'DatabaseIcon', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
      ];
    }
    case 'dashboard/charts': {
      const total = query('SELECT COUNT(*) FROM requirements')[0][0];
      const docCount = query('SELECT COUNT(*) FROM documents')[0][0];
      const cats = query('SELECT category, COUNT(*) FROM requirements GROUP BY category');
      return {
        areaData: [
          { name: '1月', 需求: 0, 知识: 0, 洞察: 0 },
          { name: '2月', 需求: 0, 知识: 0, 洞察: 0 },
          { name: '3月', 需求: 0, 知识: 0, 洞察: 0 },
          { name: '4月', 需求: 0, 知识: 0, 洞察: 0 },
          { name: '5月', 需求: total, 知识: docCount, 洞察: 0 },
          { name: '6月', 需求: 0, 知识: 0, 洞察: 0 },
          { name: '7月', 需求: 0, 知识: 0, 洞察: 0 },
        ],
        barData: cats.map(r => ({ name: r[0]||'未分类', value: r[1] })),
      };
    }
    case 'dashboard/activities': {
      const rows = query("SELECT id, title, status, updated_at FROM requirements ORDER BY updated_at DESC LIMIT 10");
      const iconMap = { '待评估': 'AlertCircleIcon', '设计中': 'EditIcon', '实现中': 'ArrowUpIcon', '测试中': 'SearchIcon', '已完成': 'CheckCircleIcon' };
      const colorMap = { '待评估': '#f59e0b', '设计中': '#6366f1', '实现中': '#06b6d4', '测试中': '#8b5cf6', '已完成': '#10b981' };
      return rows.map(r => ({ id: r[0], icon: iconMap[r[2]] || 'ClockIcon', color: colorMap[r[2]] || '#888', text: r[1] || '', time: r[3] }));
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
        const docPaths = new Set(query("SELECT file_path FROM documents WHERE file_path != ''").map(r => path.basename(r[0])));
        for (const f of files) { if (docPaths.has(f)) usedBytes += fs.statSync(path.join(uploadsDir, f)).size; }
        return { usedBytes };
      } catch { return { usedBytes: 0 }; }
    }
    default: {
      // Handle /analyze, /summarize, /preview sub-routes
      const actionMatch = table.match(/^(\w+)\/(\d+)\/(\w+)$/);
      if (actionMatch) {
        const [, resType, resId, action] = actionMatch;
        const req = query(`SELECT * FROM ${resType} WHERE id = ?`, [parseInt(resId)])[0];
        if (!req) return { error: 'Not found' };
        if (action === 'analyze') {
          const desc = (req[2] || '').trim();
          if (!desc) return { error: 'No description to analyze' };
          const aiResult = await callAI(
            `你是需求分析助手。请分析以下需求描述，输出JSON格式（不要markdown代码块，只输出纯JSON）：\n{"summary":"一段简洁的中文摘要（50字以内，抽象式总结核心意图）","tags":["标签1","标签2","标签3"]}\n\n需求描述：${desc}`
          );
          if (!aiResult) return { error: 'AI analysis failed: model not configured or API error' };
          let aiSummary = ''; let aiTags = [];
          try {
            let jsonStr = aiResult.replace(/```[a-z]*\n?/g, '').replace(/`/g, '').trim();
            let parsed;
            try {
              parsed = JSON.parse(jsonStr);
            } catch {
              const match = jsonStr.match(/\{[\s\S]*\}/);
              if (match) parsed = JSON.parse(match[0]);
              else throw new Error('No JSON object found in response');
            }
            aiSummary = parsed.summary || '';
            aiTags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [];
          } catch (parseErr) {
            log('AI analysis parse failed, raw response: ' + aiResult.substring(0, 300));
            return { error: 'AI analysis failed: invalid response format' };
          }
          if (!aiSummary) return { error: 'AI analysis failed: empty summary' };
          run(`UPDATE ${resType} SET ai_summary = ?, ai_tags = ?, image_descriptions = ? WHERE id = ?`,
            [aiSummary, JSON.stringify(aiTags), JSON.stringify([]), parseInt(resId)]);
          return { success: true, aiSummary, aiTags, imageDescriptions: [] };
        }
        if (action === 'summarize') {
          const title = req[1] || '';
          const content = (req[11] || '').substring(0, 500);
          const summary = content ? generateAISummary(content) : title;
          run(`UPDATE documents SET content = ? WHERE id = ?`, [summary, parseInt(resId)]);
          return { success: true, summary };
        }
      }
      return { error: 'Unknown table: ' + table };
    }
  }
}

function handleRequirements(method, data, id) {
  try {
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
      // Use MAX(id) instead of last_insert_rowid() — some sql.js versions return 0 from last_insert_rowid()
      const newId = query('SELECT MAX(id) FROM requirements')[0][0];
      log('handleReq POST: newId=' + newId + ' title=' + (title||'').substring(0, 30));
      return { success: true, id: newId };
    }
    case 'PUT': {
      if (!id) return { error: 'No id' };
      const { title, desc, category, module, priority, status, assignee, creator, dueDate, tags, images, workflow_handler } = data || {};
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
  } catch (e) { log('handleRequirements ERROR', e); return []; }
}

function handleDocuments(method, data, id) {
  try {
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
      return { success: true, id: query('SELECT MAX(id) FROM documents')[0][0] };
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
  } catch (e) { log('handleDocuments ERROR', e); return []; }
}

function handleMcp(method, data, id) {
  try {
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
  } catch (e) { log('handleMcp ERROR', e); return []; }
}

function handleModels(method, data, id) {
  try {
  switch (method) {
    case 'GET':
      return query('SELECT * FROM models ORDER BY is_default DESC, id DESC').map(r => ({
        id: r[0], name: r[1], provider: r[2], baseUrl: r[3], apiKey: r[4] ? '******' + r[4].slice(-4) : '',
        hasApiKey: !!r[4], modelId: r[5], enabled: !!r[6], isDefault: !!r[7], createdAt: r[9],
      }));
    case 'POST': {
      const { name, provider, baseUrl, apiKey, modelId } = data || {};
      const displayName = name || (provider + ' - ' + modelId);
      run('INSERT INTO models (name, provider, base_url, api_key, model_id, enabled) VALUES (?,?,?,?,?,1)',
        [displayName, provider||'', baseUrl||'', apiKey||'', modelId||'']);
      return { success: true, id: query('SELECT MAX(id) FROM documents')[0][0] };
    }
    case 'PUT': {
      if (!id) return { error: 'No id' };
      const { is_default, apiKey, modelId, name, enabled } = data || {};
      if (is_default) run('UPDATE models SET is_default = 0');
      const fields = []; const vals = [];
      if (name !== undefined) { fields.push('name=?'); vals.push(name); }
      if (apiKey !== undefined) { fields.push('api_key=?'); vals.push(apiKey); }
      if (modelId !== undefined) { fields.push('model_id=?'); vals.push(modelId); }
      if (is_default !== undefined) { fields.push('is_default=?'); vals.push(is_default?1:0); }
      if (enabled !== undefined) { fields.push('enabled=?'); vals.push(enabled?1:0); }
      if (fields.length) { vals.push(id); run(`UPDATE models SET ${fields.join(',')} WHERE id=?`, vals); }
      return { success: true };
    }
    case 'DELETE': { if (id) run('DELETE FROM models WHERE id = ?', [id]); return { success: true }; }
    default: return { error: 'Unknown method' };
  }
  } catch (e) { log('handleModels ERROR', e); return []; }
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
  log('createWindow: preload path = ' + preloadPath);
  log('createWindow: preload exists = ' + fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600,
    title: 'Workit',
    icon: nativeImage.createFromPath(path.join(app.getAppPath(), 'public', 'icon.png')),
    frame: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: true, preload: preloadPath },
  });

  setupWindowEvents(mainWindow);
  setupIPC();

  try {
    await initDatabase();
  } catch (dbErr) {
    log('createWindow: initDatabase FAILED', dbErr);
    console.error('initDatabase failed:', dbErr);
  }

  mainWindow.center();
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
    log('createWindow: loading HTML = ' + htmlPath);
    mainWindow.loadFile(htmlPath);
  }
  mainWindow.show();
  mainWindow.focus();

  // 渲染进程错误监听
  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    log('createWindow: renderer load FAILED, code=' + code + ', desc=' + desc);
  });
  mainWindow.webContents.on('console-message', (_, level, message) => {
    log('Renderer [' + level + ']: ' + message);
  });
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    log('createWindow: render-process-gone, reason=' + details.reason + ', exitCode=' + details.exitCode);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });
  log('createWindow: success');
  } catch (e) { log('createWindow: FAILED', e); }
}

app.whenReady().then(async () => {
  log('App ready');
  try {
    setupAutoUpdater();
    await createWindow();

    // Tray + QC window + settings
    let tray = null;
    let minimizeToTray = false;
    let qcWindow = null;

    function createTray() {
      if (tray) return;
      const icon = nativeImage.createFromPath(path.join(app.getAppPath(), 'public', 'icon.png')).resize({ width: 16, height: 16 });
      tray = new Tray(icon);
      tray.setToolTip('Workit');
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: '显示窗口', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
        { type: 'separator' },
        { label: '退出', click: () => { app.isQuitting = true; app.quit(); } }
      ]));
      tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
    }

    mainWindow.on('close', (event) => {
      if (minimizeToTray && !app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    ipcMain.handle('get-settings', () => ({
      minimizeToTray,
      openAtLogin: app.getLoginItemSettings().openAtLogin
    }));

    ipcMain.handle('set-minimize-to-tray', (_, enabled) => {
      minimizeToTray = enabled;
      if (enabled) createTray(); else { tray?.destroy(); tray = null; }
      return enabled;
    });

    ipcMain.handle('set-open-at-login', (_, enabled) => {
      app.setLoginItemSettings({ openAtLogin: enabled });
      return enabled;
    });

    // QuickCapture external popup
    ipcMain.handle('toggle-qc-window', (_, enabled) => {
      log('toggle-qc-window called: enabled=' + enabled);
      if (enabled) {
        if (!qcWindow) {
          const { screen } = require('electron');
          const disp = screen.getPrimaryDisplay();
          const { width, height } = disp.workAreaSize;
          qcWindow = new BrowserWindow({
            width: 56, height: 56,
            x: width - 76, y: height - 76,
            frame: false, resizable: false, alwaysOnTop: true,
            skipTaskbar: true, transparent: true,
            webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, additionalArguments: ['--qc-popup'] }
          });
          qcWindow.loadFile(path.join(app.getAppPath(), 'electron', 'qc-entry.html'));
          qcWindow.on('closed', () => {
            log('QC window closed');
            qcWindow = null;
            // Restore main window from tray
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
              mainWindow.focus();
            }
          });
        }
        qcWindow.show();
        log('QC window shown');
      } else {
        log('Closing QC window');
        qcWindow?.close();
      }
      return enabled;
    });

    ipcMain.handle('test-model-connection', async (_, baseUrl, apiKey, modelId) => {
      try {
        // Detect API style from baseUrl
        const isAnthropic = baseUrl.includes('anthropic');
        let url = baseUrl.replace(/\/+$/, '');
        if (isAnthropic) {
          url += '/v1/messages';
        } else {
          url += '/v1/chat/completions';
        }
        log('Model test: ' + url);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }),
          signal: AbortSignal.timeout(10000),
        });
        const text = await res.text();
        log('Model test response status=' + res.status + ' body=' + text.substring(0, 200));
        try {
          const data = JSON.parse(text);
          // OpenAI: choices[0].message.content, Anthropic: content[].text (may have thinking blocks first)
          return !!(data.choices?.[0]?.message?.content
            || (data.content && Array.isArray(data.content) && data.content.some((c) => c.type === 'text' && c.text))
            || data.id);
        } catch {
          return false;
        }
      } catch (e) {
        log('Model test failed', e);
        return false;
      }
    });

    ipcMain.handle('notify-requirements-changed', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          window.dispatchEvent(new CustomEvent('requirements-changed'));
        `);
      }
    });

    ipcMain.handle('close-qc-form', () => {
      if (qcWindow && !qcWindow.isDestroyed()) {
        qcWindow.setSize(56, 56);
        qcWindow.loadFile(path.join(app.getAppPath(), 'electron', 'qc-entry.html'));
      }
    });

    ipcMain.handle('open-qc-form', () => {
      if (qcWindow && !qcWindow.isDestroyed()) {
        qcWindow.setSize(420, 540);
        qcWindow.center();
        qcWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
      }
    });

  } catch (e) { log('App ready handler failed', e); }
});

function setupAutoUpdater() {
  if (isDev) return;
  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Manual check: just report what's available, don't trigger download
    ipcMain.handle('check-for-update', async () => {
      try {
        const r = await autoUpdater.checkForUpdates();
        const current = app.getVersion();
        if (r?.updateInfo?.version) {
          const v = r.updateInfo.version;
          log('Updater check: found v' + v + ' current=' + current);
          return { available: v !== current, version: v, current };
        }
        return { available: false, current };
      } catch (e) {
        log('Updater check error: ' + (e.message || e));
        return { available: false, error: e.message || 'Unknown error', current: app.getVersion() };
      }
    });

    ipcMain.handle('download-update', async () => {
      try { await autoUpdater.downloadUpdate(); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    });

    ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall(); return true; });

    autoUpdater.on('update-available', (info) => {
      log('Updater: v' + info.version + ' available, auto-downloading...');
      mainWindow?.webContents?.send('update-available', info.version);
    });
    autoUpdater.on('download-progress', (p) => {
      mainWindow?.webContents?.send('update-download-progress', Math.round(p.percent));
    });
    autoUpdater.on('update-downloaded', () => {
      log('Updater: downloaded, install on quit');
      mainWindow?.webContents?.send('update-downloaded');
    });
    autoUpdater.on('error', (e) => log('Updater error: ' + e.message));

    autoUpdater.logger = {
      debug: () => {}, info: (m) => log('Updater: ' + m),
      warn: (m) => log('Updater warn: ' + m), error: (m) => log('Updater error: ' + m)
    };

    // Startup: auto-check & download in background
    setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 10000);
  } catch (e) { log('AutoUpdater init failed', e); }
}

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://') && !url.startsWith('http://localhost')) event.preventDefault();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
