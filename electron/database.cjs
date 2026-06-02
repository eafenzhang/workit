// database.js — Database layer: init, query, run, encryption, formatting
const { app, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

// Module-level state
let _logPath = '';
let _dbPath = '';
let _saveTimer = null;

// P0-01: Whitelist for dynamic table names used in SQL
const ALLOWED_TABLES = ['requirements', 'documents', 'mcp_servers', 'models', 'knowledge_categories', 'skills', 'claude_code_plugins', 'cli_tools', 'requirement_modules'];

// P1-09: Whitelist for allowed IPC methods on db-query
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

// P0-02: Whitelists for dynamic field names in MCP/Models PUT
const MCP_FIELDS = new Map([
  ['enabled', (v) => v ? 1 : 0],
  ['config', (v) => JSON.stringify(v)],
  ['name', (v) => v],
  ['type', (v) => v],
  ['command', (v) => v],
  ['args', (v) => JSON.stringify(v)],
  ['env', (v) => JSON.stringify(v)],
]);
const MODEL_FIELDS = new Map([
  ['name', (v) => v],
  ['apiKey', (v) => v],
  ['modelId', (v) => v],
  ['is_default', (v) => v ? 1 : 0],
  ['enabled', (v) => v ? 1 : 0],
]);

function log(msg, err) {
  try {
    if (!_logPath) _logPath = path.join(app.getPath('userData'), 'workit.log');
    const line = `[${new Date().toISOString()}] ${msg}${err ? ': ' + (err.message || err) : ''}\n`;
    fs.appendFile(_logPath, line, () => {});
  } catch (e) {
    // Fallback: write to stderr so we can see log failures
    process.stderr.write(`[LOG-FAIL] ${msg}: ${e.message}\n`);
  }
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err?.message || err, err?.stack);
  try { fs.appendFileSync(_logPath || 'crash.log', (err?.stack || String(err)) + '\n'); } catch {}
});
process.on('unhandledRejection', (err) => { log('UNHANDLED REJECTION', err); });

// ========== Database ==========
async function initDatabase(userDataPath) {
  const sqlJsInit = require('sql.js');
  const SQL = await sqlJsInit();
  const dbPath = path.join(userDataPath || app.getPath('userData'), 'workit-data.db');
  _dbPath = dbPath;
  const dbBackupPath = path.join(userDataPath || app.getPath('userData'), 'workit-data.db.bak');

  let db;

  // P1-10: Database corruption recovery
  try {
    if (fs.existsSync(dbPath)) {
      // Create startup backup before any write operations
      try {
        fs.copyFileSync(dbPath, dbBackupPath);
        log('initDatabase: backup created at ' + dbBackupPath);
      } catch (backupErr) {
        log('initDatabase: backup creation failed (non-fatal)', backupErr);
      }
      const fileData = fs.readFileSync(dbPath);
      db = new SQL.Database(fileData);
      // Quick integrity check: try a simple query
      db.exec('SELECT 1');
    } else if (fs.existsSync(dbBackupPath)) {
      // Restore from backup if main DB is missing (e.g. after reinstall)
      log('initDatabase: main DB missing, restoring from backup');
      fs.copyFileSync(dbBackupPath, dbPath);
      const fileData = fs.readFileSync(dbPath);
      db = new SQL.Database(fileData);
      db.exec('SELECT 1');
    } else {
      db = new SQL.Database();
    }
  } catch (dbErr) {
    log('initDatabase: corruption detected or read error', dbErr);
    // Try to restore from backup
    if (fs.existsSync(dbBackupPath)) {
      try {
        log('initDatabase: attempting restore from backup');
        fs.copyFileSync(dbBackupPath, dbPath);
        const fileData = fs.readFileSync(dbPath);
        db = new SQL.Database(fileData);
        db.exec('SELECT 1');
        log('initDatabase: restored from backup successfully');
      } catch (restoreErr) {
        log('initDatabase: restore from backup also failed, creating fresh DB', restoreErr);
        try {
          const corruptPath = dbPath + '.corrupt.' + Date.now();
          if (fs.existsSync(dbPath)) fs.renameSync(dbPath, corruptPath);
        } catch {}
        db = new SQL.Database();
      }
    } else {
      try {
        const backupPath = dbPath + '.corrupt.' + Date.now();
        if (fs.existsSync(dbPath)) fs.renameSync(dbPath, backupPath);
      } catch (backupErr) {
        log('initDatabase: backup failed', backupErr);
      }
      db = new SQL.Database();
    }
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
  db.run(`CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    source TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS claude_code_plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    source TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS cli_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    source TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS requirement_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  // Seed default modules if table is empty
  const modCount = db.exec("SELECT COUNT(*) FROM requirement_modules")[0]?.values[0][0] || 0;
  if (modCount === 0) {
    const defaults = ['系统后台', '机构后台', '品牌门店', '收银终端', '用户端', '开放平台'];
    const stmt = db.prepare('INSERT INTO requirement_modules (name, sort_order) VALUES (?, ?)');
    defaults.forEach((name, i) => stmt.run([name, i]));
    stmt.free();
  }
  db.run(`CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, provider TEXT NOT NULL,
    base_url TEXT DEFAULT '', api_key TEXT DEFAULT '', model_id TEXT NOT NULL,
    enabled INTEGER DEFAULT 0, is_default INTEGER DEFAULT 0, config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // P2-12: Schema version tracking for versioned migrations
  db.run(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // Determine current schema version
  let currentVersion = 0;
  try {
    const verRow = db.exec("SELECT MAX(version) FROM schema_version");
    if (verRow.length > 0 && verRow[0].values.length > 0 && verRow[0].values[0][0] !== null) {
      currentVersion = verRow[0].values[0][0];
    }
  } catch { currentVersion = 0; }

  // P1-14: Migration v1 — knowledge_categories table
  if (currentVersion < 1) {
    log('initDatabase: running migration v1 (knowledge_categories)');
    db.run(`CREATE TABLE IF NOT EXISTS knowledge_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
    // Seed default categories if table is empty
    const existingCats = db.exec("SELECT COUNT(*) FROM knowledge_categories");
    const catCount = (existingCats.length > 0 && existingCats[0].values.length > 0) ? existingCats[0].values[0][0] : 0;
    if (catCount === 0) {
      db.run("INSERT OR IGNORE INTO knowledge_categories (name) VALUES ('指南')");
      db.run("INSERT OR IGNORE INTO knowledge_categories (name) VALUES ('参考')");
      db.run("INSERT OR IGNORE INTO knowledge_categories (name) VALUES ('笔记')");
      log('initDatabase: seeded default knowledge categories');
    }
    db.run("INSERT OR REPLACE INTO schema_version (version) VALUES (1)");
    currentVersion = 1;
  }

  // Migration v2 — agent_memories table for AI long-term memory
  if (currentVersion < 2) {
    log('initDatabase: running migration v2 (agent_memories)');
    db.run(`CREATE TABLE IF NOT EXISTS agent_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT '',
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
    db.run("INSERT OR REPLACE INTO schema_version (version) VALUES (2)");
    currentVersion = 2;
  }

  // Migrate old status
  db.run("UPDATE requirements SET status = '待评估' WHERE status = '待评审'");

  // Migrate: add content_blocks column for unified content rendering
  try {
    db.run("ALTER TABLE requirements ADD COLUMN content_blocks TEXT DEFAULT '[]'");
    log('initDatabase: content_blocks column added');
  } catch (e) {
    // Column may already exist — ignore
    log('initDatabase: content_blocks migration (column may already exist)', e);
  }

  // Migrate: add endpoint column to models table
  try {
    db.run("ALTER TABLE models ADD COLUMN endpoint TEXT DEFAULT '/chat/completions'");
    log('initDatabase: endpoint column added to models');
  } catch (e) {
    // Column may already exist — ignore
  }

  // Performance: add index for list query ORDER BY created_at DESC
  db.run('CREATE INDEX IF NOT EXISTS idx_requirements_created_at ON requirements(created_at)');

  // P0-03: Indexes for requirements status/category filtering
  db.run('CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_requirements_category ON requirements(category)');

  // P0-04: Indexes for documents type/featured filtering
  db.run('CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_documents_featured ON documents(featured)');

  // Fix minimax base URL if it was set to the wrong value
  db.run("UPDATE models SET base_url = 'https://api.minimax.chat/v1' WHERE base_url = 'https://api.minimaxi.com/anthropic'");
  // Fix deepseek base URL — v4 models require /v1 prefix
  db.run("UPDATE models SET base_url = 'https://api.deepseek.com/v1' WHERE base_url = 'https://api.deepseek.com' AND provider = 'deepseek'");

  saveDb(db);
  log('initDatabase: success, path=' + dbPath);
  return db;
}

// P1-01: Debounced save (200ms) + atomic write (tmp + rename)
function debouncedSaveDb(db) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => saveDb(db), 200);
}

function saveDb(db) {
  if (!db) return;
  try {
    const tmpPath = _dbPath + '.tmp';
    const data = db.export();
    fs.writeFileSync(tmpPath, data);
    fs.renameSync(tmpPath, _dbPath);
  } catch (e) {
    log('saveDb FAILED (disk write error — data still in memory)', e);
  }
}

// P1-02: Null checks for query/run
function query(db, sql, params = []) {
  if (!db) { log('query called but db is null'); return []; }
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.get());
  stmt.free();
  return rows;
}

function run(db, sql, params = []) {
  if (!db) { log('run called but db is null'); return; }
  db.run(sql, params);
  debouncedSaveDb(db); // P1-01: debounced instead of sync save
}

// P0-03: Encrypt API key before storage
function encryptApiKey(plainText) {
  if (!plainText) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(plainText).toString('base64');
    }
  } catch (e) {
    log('encryptApiKey failed, storing as plaintext', e);
  }
  return plainText;
}

// P0-03: Decrypt API key with fallback for old plaintext data
function decryptApiKey(stored) {
  if (!stored) return '';
  try {
    // Try decrypting (new encrypted format)
    if (safeStorage.isEncryptionAvailable()) {
      const buf = Buffer.from(stored, 'base64');
      // safeStorage encrypted buffers are not valid UTF-8 plaintext
      // If decryptString succeeds, it was encrypted
      return safeStorage.decryptString(buf);
    }
  } catch {
    // Fallback: old plaintext data (not encrypted)
    return stored;
  }
  return stored;
}

function getDefaultModel(db) {
  const rows = query(db, 'SELECT * FROM models WHERE enabled = 1 AND is_default = 1 LIMIT 1');
  if (!rows.length) {
    const any = query(db, 'SELECT * FROM models WHERE enabled = 1 LIMIT 1');
    if (!any.length) {
      const all = query(db, 'SELECT * FROM models');
      log('getDefaultModel: no enabled model found. Total models: ' + all.length);
      return null;
    }
    log('getDefaultModel: using first enabled model: ' + any[0][1]);
    return { baseUrl: any[0][3], apiKey: decryptApiKey(any[0][4]), modelId: any[0][5], endpoint: any[0][10] || '' };
  }
  log('getDefaultModel: using default model: ' + rows[0][1]);
  return { baseUrl: rows[0][3], apiKey: decryptApiKey(rows[0][4]), modelId: rows[0][5], endpoint: rows[0][10] || '' };
}

async function callAI(db, prompt) {
  const model = getDefaultModel(db);
  if (!model || !model.apiKey) return null;
  const result = await _callModel(model, [{ role: 'user', content: prompt }]);
  return result ? result.content : null;
}

/**
 * Chat with full conversation history, system prompt, custom model selection,
 * and MCP tool calling support.
 *
 * Looks up the model configuration by providerId (the DB model row id), decrypts the
 * API key, builds a message list with optional system prompt, and delegates to _callModel.
 * If MCP tools are available, injects them and handles tool calling loops (max 5 rounds).
 *
 * @param {object} db - The SQL.js database instance
 * @param {object} options
 * @param {string} [options.providerId] - The database row id of the model config to use
 * @param {string} [options.modelId] - Override the model identifier (e.g. "deepseek-chat")
 * @param {Array<{role: string, content: string}>} options.messages - Conversation messages
 * @param {string} [options.systemPrompt] - Optional system-level prompt
 * @param {boolean} [options.mcpEnabled] - Whether to include MCP tools
 * @returns {Promise<{content?: string, error?: string, toolCallHistory?: Array}>} The AI response content or an error
 */
async function chatWithAI(db, { providerId, modelId, messages, systemPrompt, mcpEnabled, toolsEnabled }) {
  // Look up model by provider + model_id (not database row id)
  let model;
  let isAnthropic = false;
  if (providerId && modelId) {
    const rows = query(db, 'SELECT base_url, api_key, model_id, endpoint FROM models WHERE provider = ? AND model_id = ? AND enabled = 1 LIMIT 1', [providerId, modelId]);
    if (rows.length > 0) {
      const apiKey = decryptApiKey(rows[0][1]);
      model = { baseUrl: rows[0][0], apiKey: apiKey, modelId: rows[0][2], endpoint: rows[0][3] || '' };
      isAnthropic = (rows[0][0] || '').includes('anthropic');
    }
  }
  if (!model) model = getDefaultModel(db);
  if (model) {
    isAnthropic = isAnthropic || (model.baseUrl || '').includes('anthropic') || (model.endpoint || '').includes('messages');
  }
  if (!model || !model.apiKey) return { error: '未配置 API Key' };

  // Build message list with system prompt
  let effectiveSystemPrompt = systemPrompt || '';

  // ── Skills / Plugins → inject into system prompt ──
  if (toolsEnabled) {
    try {
      const skillsCtx = getSkillsSystemPrompt(db);
      const pluginsCtx = getPluginsSystemPrompt(db);
      if (skillsCtx) effectiveSystemPrompt = (effectiveSystemPrompt ? effectiveSystemPrompt + '\n\n' : '') + skillsCtx;
      if (pluginsCtx) effectiveSystemPrompt = (effectiveSystemPrompt ? effectiveSystemPrompt + '\n\n' : '') + pluginsCtx;
    } catch (e) { log('chatWithAI: skills/plugins inject skipped', e); }
  }

  const msgs = [];
  if (effectiveSystemPrompt) msgs.push({ role: 'system', content: effectiveSystemPrompt });
  msgs.push(...messages);

  try {
    // ── MCP + CLI Tool Injection ──
    let tools = null;
    if (toolsEnabled) {
      try {
        const allTools = [];
        // MCP tools
        try {
          const { McpClientManager } = require('./mcp-manager.cjs');
          const mcpManager = McpClientManager.getInstance();
          const provider = isAnthropic ? 'anthropic' : 'openai';
          const mcpTools = mcpManager.getToolsForLLM(provider);
          if (mcpTools.length > 0) {
            allTools.push(...mcpTools);
            log('chatWithAI: injecting ' + mcpTools.length + ' MCP tools');
          }
        } catch (e) { log('chatWithAI: MCP tool loading skipped', e); }
        // CLI tools
        try {
          const cliTools = getCliToolsForLLM(db, isAnthropic ? 'anthropic' : 'openai');
          if (cliTools.length > 0) {
            allTools.push(...cliTools);
            log('chatWithAI: injecting ' + cliTools.length + ' CLI tools');
          }
        } catch (e) { log('chatWithAI: CLI tool loading skipped', e); }
        if (allTools.length > 0) tools = allTools;
      } catch (e) {
        log('chatWithAI: tool injection failed', e);
      }
    }

    // ── Tool calling loop (max 5 rounds) ──
    const MAX_TOOL_ROUNDS = 5;
    let currentMessages = [...msgs];
    /** @type {Array<{toolName: string, serverName: string, args: Object, result: string}>} */
    const toolCallHistory = [];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const result = await _callModel(model, currentMessages, tools);

      // If no tool calls, return content directly
      if (!result.tool_calls || result.tool_calls.length === 0) {
        return {
          content: result.content,
          toolCallHistory: toolCallHistory.length > 0 ? toolCallHistory : undefined,
        };
      }

      // Prevent infinite loops — if we've hit max rounds, force final response
      if (round >= MAX_TOOL_ROUNDS) {
        log('chatWithAI: max tool call rounds (' + MAX_TOOL_ROUNDS + ') reached');
        currentMessages.push({
          role: 'user',
          content: '你已调用工具多次，请基于已获得的信息直接回答用户的问题，不要再调用工具。',
        });
        const finalResult = await _callModel(model, currentMessages, null); // no tools
        return {
          content: finalResult.content,
          toolCallHistory,
        };
      }

      // Execute tool calls
      const toolResults = await handleToolCalls(result.tool_calls, isAnthropic, db);
      toolCallHistory.push(...toolResults);

      // Append assistant message (with tool_calls) and tool results to conversation
      if (isAnthropic) {
        // Anthropic format: assistant content + tool_result blocks
        const assistantBlocks = [];
        for (const tc of result.tool_calls) {
          assistantBlocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.args,
          });
        }
        currentMessages.push({ role: 'assistant', content: assistantBlocks });

        const toolResultBlocks = [];
        for (const tr of toolResults) {
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tr.id,
            content: tr.result,
          });
        }
        currentMessages.push({ role: 'user', content: toolResultBlocks });
      } else {
        // OpenAI format
        currentMessages.push({
          role: 'assistant',
          content: result.content || null,
          tool_calls: result.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args),
            },
          })),
        });
        for (const tr of toolResults) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: tr.id,
            content: tr.result,
          });
        }
      }

      log('chatWithAI: round ' + (round + 1) + ' complete, ' + toolResults.length + ' tool calls executed');
    }

    // Should never reach here due to the round < MAX_TOOL_ROUNDS check above
    return { content: '', toolCallHistory };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Low-level HTTP call to an AI model provider.
 *
 * Constructs the request URL from the model's base URL, detecting Anthropic-style
 * endpoints (which use `/v1/messages` and `x-api-key` header) versus OpenAI-style
 * (which use `/v1/chat/completions` and `Authorization: Bearer`).
 *
 * @param {{baseUrl: string, apiKey: string, modelId: string}} model - Model configuration
 * @param {Array<{role: string, content: string|Array}>} messages - Message array
 * @param {Array<Object>|null} [tools=null] - Optional tool definitions for function calling
 * @returns {Promise<{content: string, tool_calls: Array|null, stop_reason: string}>}
 * @throws {Error} If the API returns an error or unexpected format
 */
async function _callModel(model, messages, tools) {
  const isAnthropic = model.endpoint?.includes('messages') || model.baseUrl.includes('anthropic');
  let url = model.baseUrl.replace(/\/+$/, '');
  if (model.endpoint) {
    // Prevent double version prefix: baseUrl/v1 + endpoint/v1/messages → /v1/v1/messages
    const ep = model.endpoint;
    const m = url.match(/\/v\d+$/);
    if (m && ep.startsWith(m[0] + '/')) {
      url = url.slice(0, -m[0].length) + ep;
    } else {
      url += ep;
    }
  } else if (isAnthropic) url += '/v1/messages';
  else {
    // Strip trailing /v1 to avoid double-prefix (e.g., baseUrl/v1 + /v1/chat/completions)
    if (!url.endsWith('/v1')) url += '/v1';
    url += '/chat/completions';
  }

  log('_callModel URL: ' + url + ' | modelId=' + model.modelId + ' | endpoint=' + (model.endpoint || '(none)') + ' | tools=' + (tools ? tools.length : 0));

  const headers = { 'Content-Type': 'application/json' };
  if (isAnthropic) {
    headers['x-api-key'] = model.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = 'Bearer ' + model.apiKey;
  }

  // Build body with optional tools
  let body;
  if (isAnthropic) {
    body = {
      model: model.modelId,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content,
      max_tokens: 4000,
      temperature: 0.7,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }
  } else {
    body = {
      model: model.modelId,
      messages,
      max_tokens: 4000,
      temperature: 0.7,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  let data;
  try { data = await res.json(); }
  catch {
    const text = await res.text().catch(() => '');
    throw new Error('模型返回非 JSON: HTTP ' + res.status + ' ' + res.statusText + (text ? ' — ' + text.substring(0, 200) : ''));
  }
  log('_callModel response status=' + res.status + ' preview=' + JSON.stringify(data).substring(0, 300));

  // ── Parse structured response (content + tool_calls) ──
  let content = '';
  let toolCalls = null;
  let stopReason = 'stop';

  if (isAnthropic) {
    // Anthropic response: content[] with text and tool_use blocks
    if (data.content && Array.isArray(data.content)) {
      const textBlocks = [];
      const toolBlocks = [];
      for (const c of data.content) {
        if (c.type === 'text' && c.text) {
          textBlocks.push(c.text);
        } else if (c.type === 'tool_use') {
          toolBlocks.push({
            id: c.id,
            name: c.name,
            args: c.input || {},
          });
        } else if (c.thinking) {
          textBlocks.push(c.thinking);
        }
      }
      content = textBlocks.join('\n');
      if (toolBlocks.length > 0) toolCalls = toolBlocks;
    }
    stopReason = data.stop_reason || 'stop';
  } else {
    // OpenAI response
    if (data.choices?.[0]?.message) {
      const msg = data.choices[0].message;
      content = msg.content || '';
      stopReason = data.choices[0].finish_reason || 'stop';

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        toolCalls = msg.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          args: (() => { try { return JSON.parse(tc.function.arguments); } catch { return tc.function.arguments; } })(),
        }));
      }
    }
  }

  if (!content && !toolCalls) {
    if (data.error) throw new Error(data.error.message || data.error.code || 'API 错误');
    throw new Error('模型返回格式异常');
  }

  return { content: content.trim(), tool_calls: toolCalls, stop_reason: stopReason };
}

/**
 * Execute MCP tool calls from LLM response and return results.
 * @param {Array<{id: string, name: string, args: Object}>} toolCalls - Parsed tool calls from LLM
 * @param {boolean} isAnthropic - Whether the provider is Anthropic
 * @returns {Promise<Array<{id: string, toolName: string, serverName: string, args: Object, result: string}>>}
 */
async function handleToolCalls(toolCalls, isAnthropic, db) {
  const { McpClientManager } = require('./mcp-manager.cjs');
  const mcpManager = McpClientManager.getInstance();
  const results = [];

  for (const tc of toolCalls) {
    log('handleToolCalls: executing ' + tc.name);
    try {
      let resultText;
      // Check if it's a CLI tool (prefixed with cli__) or MCP tool (prefixed with serverName__)
      if (tc.name.startsWith('cli__')) {
        // CLI tool: extract real name, spawn process, return stdout
        const cliName = tc.name.slice('cli__'.length);
        resultText = await executeCliTool(cliName, tc.args, db);
      } else {
        // MCP tool
        const result = await mcpManager.executeTool(tc.name, tc.args);
        resultText = result.success
          ? (typeof result.content === 'string' ? result.content : JSON.stringify(result.content))
          : 'Error: ' + (result.error || 'Unknown error');
      }
      results.push({ id: tc.id, toolName: tc.name, args: tc.args, result: resultText });
    } catch (e) {
      results.push({ id: tc.id, toolName: tc.name, args: tc.args,
        result: 'Tool execution error: ' + (e.message || String(e)) });
    }
  }
  return results;
}

function formatReq(r) {
  // NOTE: ALTER TABLE ADD COLUMN appends to end. content_blocks is at index 19, NOT 15.
  // Original columns 15-18 (workflow_handler, workflow_history, created_at, updated_at)
  // remain at their original positions.
  return {
    id: r[0], title: r[1], desc: r[2], category: r[3], module: r[4]||'用户端', priority: r[5],
    status: r[6], assignee: r[7], creator: r[8], dueDate: r[9], tags: JSON.parse(r[10]||'[]'),
    images: JSON.parse(r[11]||'[]'), aiSummary: r[12]||'', aiTags: JSON.parse(r[13]||'[]'),
    imageDescriptions: JSON.parse(r[14]||'[]'),
    workflowHandler: r[15]||'', workflowHistory: JSON.parse(r[16]||'[]'),
    createdAt: r[17], updatedAt: r[18],
    contentBlocks: (() => { try { return JSON.parse(r[19] || '[]'); } catch { return []; } })(),
  };
}

// Lightweight formatter for list queries — only fields needed by list view
function formatReqList(r) {
  return {
    id: r[0], title: r[1], desc: r[2], category: r[3], module: r[4]||'用户端', priority: r[5],
    status: r[6], assignee: r[7], creator: r[8],
    images: JSON.parse(r[9]||'[]'), aiSummary: r[10]||'', aiTags: JSON.parse(r[11]||'[]'),
    createdAt: r[12],
  };
}

function formatDoc(r) {
  return {
    id: r[0], title: r[1], category: r[2], type: r[3], size: r[4],
    views: r[5], stars: r[6], date: r[7], tags: JSON.parse(r[8]||'[]'),
    featured: r[9]===1, file_path: r[10]||'', content: r[11]||'',
    imageDescriptions: JSON.parse(r[12]||'[]'), createdAt: r[13],
  };
}

// ========== Role Configs ==========
const ROLE_CONFIGS = {
  '市场': { personality: '创意丰富、善于沟通、关注用户体验', memory_skills: '市场分析、用户调研、竞品洞察、品牌策略', avatarColor: '#f59e0b' },
  '产品': { personality: '逻辑清晰、注重细节、以用户为中心', memory_skills: '需求分析、产品规划、PRD撰写、数据驱动', avatarColor: '#6366f1' },
  '研发': { personality: '严谨高效、追求优雅、深入底层', memory_skills: '系统架构、代码审查、性能优化、技术选型', avatarColor: '#10b981' },
  '测试': { personality: '细致入微、追求质量、零容忍Bug', memory_skills: '测试用例设计、自动化测试、回归验证、性能测试', avatarColor: '#ef4444' },
  '技术': { personality: '全栈多面手、快速学习、实战派', memory_skills: '架构设计、DevOps、安全审计、技术写作', avatarColor: '#8b5cf6' },
};

// ========== User Profile ==========
function formatUserProfile(r) {
  return {
    nickname: r[1] || '',
    role: r[2] || '',
    avatar: r[3] || '',
    personality: r[4] || '',
    memory_skills: r[5] || '',
  };
}

function formatSkill(r) {
  return {
    id: r[0], name: r[1], description: r[2], source: r[3],
    enabled: r[4] === 1, config: (() => { try { return JSON.parse(r[5]||'{}'); } catch { return {}; } })(),
    createdAt: r[6], updatedAt: r[7],
  };
}

function formatPlugin(r) {
  return {
    id: r[0], name: r[1], description: r[2], source: r[3],
    enabled: r[4] === 1, config: (() => { try { return JSON.parse(r[5]||'{}'); } catch { return {}; } })(),
    createdAt: r[6], updatedAt: r[7],
  };
}

function formatCliTool(r) {
  return {
    id: r[0], name: r[1], description: r[2], source: r[3],
    enabled: r[4] === 1, config: (() => { try { return JSON.parse(r[5]||'{}'); } catch { return {}; } })(),
    createdAt: r[6], updatedAt: r[7],
  };
}

// ── CLI Tool helpers ─────────────────────────────────────────────

/**
 * Get enabled CLI tools as LLM function calling tools.
 * CLI tools prefixed with "cli__" to avoid naming conflicts with MCP tools.
 */
function getCliToolsForLLM(db, provider) {
  const rows = query(db, "SELECT name, description, config FROM cli_tools WHERE enabled = 1");
  return rows.map(r => {
    const cfg = safeJson(r[2]);
    const name = r[0];
    const desc = r[1] || `Execute CLI command: ${name}`;
    if (provider === 'anthropic') {
      return {
        name: 'cli__' + name,
        description: desc,
        input_schema: {
          type: 'object',
          properties: {
            args: { type: 'array', items: { type: 'string' }, description: 'Additional arguments to pass to the command' },
            stdin: { type: 'string', description: 'Optional stdin input for the command' },
          },
        },
      };
    }
    // OpenAI format
    return {
      type: 'function',
      function: {
        name: 'cli__' + name,
        description: desc,
        parameters: {
          type: 'object',
          properties: {
            args: { type: 'array', items: { type: 'string' }, description: 'Additional arguments to pass' },
            stdin: { type: 'string', description: 'Optional stdin input' },
          },
        },
      },
    };
  });
}

/**
 * Execute a CLI tool by spawning its command from config.
 * @param {string} name - CLI tool name (without cli__ prefix)
 * @param {Object} llmArgs - Arguments from LLM
 * @param {*} db - SQLite database connection
 */
async function executeCliTool(name, llmArgs, db) {
  const { spawn } = require('child_process');
  // Look up tool config
  const rows = query(db, 'SELECT config FROM cli_tools WHERE name = ? AND enabled = 1', [name]);
  if (rows.length === 0) return 'Error: CLI tool not found: ' + name;
  const cfg = safeJson(rows[0][1]);
  const command = cfg.command || name;
  const args = [...(cfg.args || []), ...(llmArgs && llmArgs.args ? llmArgs.args : [])];

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: cfg.cwd || undefined,
      env: { ...process.env, ...(cfg.env || {}) },
      timeout: 30000,
      shell: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      const out = stdout.trim();
      const err = stderr.trim();
      if (code === 0) {
        resolve(out || '(no output)');
      } else {
        resolve('Error (exit ' + code + '): ' + (err || out || 'unknown error'));
      }
    });
    child.on('error', (e) => { resolve('Spawn error: ' + e.message); });
    // Send stdin if provided
    if (llmArgs && llmArgs.stdin && child.stdin) {
      child.stdin.write(llmArgs.stdin);
      child.stdin.end();
    }
  });
}

/**
 * Build system prompt context from enabled skills.
 */
function getSkillsSystemPrompt(db) {
  const rows = query(db, "SELECT name, description, config FROM skills WHERE enabled = 1");
  if (rows.length === 0) return '';
  const lines = ['## 可用技能 (Skills)\n'];
  for (const r of rows) {
    const cfg = safeJson(r[2]);
    const detail = cfg.instructions || cfg.prompt || '';
    lines.push(`- **${r[0]}**: ${r[1] || 'No description'}${detail ? '\n  ' + detail : ''}`);
  }
  lines.push('\n根据用户需求选择使用合适的技能。');
  return lines.join('\n');
}

/**
 * Build system prompt context from enabled Claude Code plugins.
 */
function getPluginsSystemPrompt(db) {
  const rows = query(db, "SELECT name, description, config FROM claude_code_plugins WHERE enabled = 1");
  if (rows.length === 0) return '';
  const lines = ['## 可用插件 (Plugins)\n'];
  for (const r of rows) {
    const cfg = safeJson(r[2]);
    const detail = cfg.instructions || cfg.prompt || '';
    lines.push(`- **${r[0]}**: ${r[1] || 'No description'}${detail ? '\n  ' + detail : ''}`);
  }
  lines.push('\n根据用户需求选择使用合适的插件功能。');
  return lines.join('\n');
}

function safeJson(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

// ── Agent Memory CRUD ──
function getMemories(db) {
  const rows = query(db, 'SELECT id, key, value, source, created_at, updated_at FROM agent_memories ORDER BY key');
  return rows.map(r => ({ id: r[0], key: r[1], value: r[2], source: r[3], createdAt: r[4], updatedAt: r[5] }));
}

function upsertMemory(db, { key, value, source }) {
  const rows = query(db, 'SELECT id FROM agent_memories WHERE key = ?', [key]);
  if (rows.length > 0) {
    run(db, 'UPDATE agent_memories SET value = ?, source = ?, updated_at = datetime("now","localtime") WHERE key = ?', [value, source || '', key]);
    return { updated: true, key };
  } else {
    run(db, 'INSERT INTO agent_memories (key, value, source) VALUES (?, ?, ?)', [key, value, source || '']);
    return { created: true, key };
  }
}

function deleteMemory(db, key) {
  run(db, 'DELETE FROM agent_memories WHERE key = ?', [key]);
  return { deleted: true, key };
}

function clearMemories(db) {
  run(db, 'DELETE FROM agent_memories');
  return { cleared: true };
}

function getMemorySummary(db) {
  const rows = query(db, 'SELECT key, value FROM agent_memories ORDER BY key');
  if (rows.length === 0) return '';
  return rows.map(r => `- ${r[0]}: ${r[1]}`).join('\n');
}

module.exports = {
  ALLOWED_TABLES,
  ALLOWED_METHODS,
  log,
  initDatabase,
  saveDb,
  query,
  run,
  encryptApiKey,
  decryptApiKey,
  getDefaultModel,
  callAI,
  chatWithAI,
  getMemories,
  upsertMemory,
  deleteMemory,
  clearMemories,
  getMemorySummary,
  formatReq,
  formatReqList,
  formatDoc,
  formatUserProfile,
  formatSkill,
  formatPlugin,
  formatCliTool,
};
