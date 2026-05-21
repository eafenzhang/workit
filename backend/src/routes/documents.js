import express from 'express';
import { getDb } from '../db/index.js';

const app = express.Router();

// 列表
app.get('/', (req, res) => {
  const db = getDb();
  let results = db.exec("SELECT id, title, category, type, size, views, stars, date, tags, featured, created_at FROM documents ORDER BY created_at DESC")[0]?.values || [];
  const { category, search } = req.query;
  if (category && category !== 'all') results = results.filter(r => r[2] === category);
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(r => (r[1]||'').toLowerCase().includes(s));
  }
  res.json(results.map(r => ({
    id: r[0], title: r[1], category: r[2], type: r[3],
    size: r[4], views: r[5], stars: r[6], date: r[7],
    tags: JSON.parse(r[8] || '[]'), featured: r[9] === 1,
  })));
});

// 详情（含内容）
app.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.exec(`SELECT id, title, category, type, size, views, stars, date, tags, featured, content, image_descriptions, created_at FROM documents WHERE id = ${req.params.id}`)[0]?.values[0];
  if (!row) return res.status(404).json({ error: 'Not found' });

  db.run(`UPDATE documents SET views = views + 1 WHERE id = ${req.params.id}`);

  res.json({
    id: row[0], title: row[1], category: row[2], type: row[3],
    size: row[4], views: row[5] + 1, stars: row[6], date: row[7],
    tags: JSON.parse(row[8]||'[]'), featured: row[9]===1,
    content: row[10] || '',
    imageDescriptions: JSON.parse(row[11]||'[]'),
    createdAt: row[12],
  });
});

// 新建
app.post('/', (req, res) => {
  const db = getDb();
  const { title, category = 'guide', type = 'MD', size = '', date = '', tags = [], featured = false, content = '', file_path = '' } = req.body;
  const stmt = db.prepare(`INSERT INTO documents (title, category, type, size, date, tags, featured, content, file_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run([title, category, type, size, date, JSON.stringify(tags), featured ? 1 : 0, content, file_path]);
  const id = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
  stmt.free();
  res.json({ success: true, id });
});

// 更新（含内容）
app.put('/:id', (req, res) => {
  const db = getDb();
  const { title, category, type, size, date, tags, featured, content } = req.body;
  const stmt = db.prepare(`UPDATE documents SET title=?, category=?, type=?, size=?, date=?, tags=?, featured=?, content=?, updated_at=datetime('now','localtime') WHERE id=?`);
  stmt.run([title||'', category||'', type||'', size||'', date||'', JSON.stringify(tags||[]), featured?1:0, content||'', req.params.id]);
  stmt.free();
  res.json({ success: true });
});

// 删除
app.delete('/:id', (req, res) => {
  getDb().run(`DELETE FROM documents WHERE id = ${req.params.id}`);
  res.json({ success: true });
});

// 图片 AI 识别（从文档 content 的 markdown 图片语法提取 URL）
app.post('/:id/analyze-images', async (req, res) => {
  const db = getDb();
  const row = db.exec(`SELECT id, title, content, image_descriptions FROM documents WHERE id = ${req.params.id}`)[0]?.values[0];
  if (!row) return res.status(404).json({ error: 'Not found' });

  const [id, title, content, existingDescs] = [row[0], row[1], row[2]||'', JSON.parse(row[3]||'[]')];
  const imageDescs = [...existingDescs];

  const models = db.exec("SELECT name, provider, base_url, api_key, model_id FROM models WHERE enabled = 1 AND is_default = 1")[0]?.values || [];
  if (models.length === 0) return res.status(400).json({ error: '无可用模型，请先配置默认模型' });

  const [modelName, provider, baseUrl, apiKey, modelId] = models[0];

  const getEndpoint = (provider, baseUrl) => {
    const base = baseUrl.replace(/\/$/, '');
    const endpoints = {
      'deepseek': '/chat/completions', 'openai': '/chat/completions',
      'anthropic': '/messages', 'google': '/v1beta/openai/chat/completions',
      'moonshot': '/chat/completions', 'zhipu': '/chat/completions',
      'dashscope': '/services/aigc/text-generation/generation',
      'volcengine': '/chat/completions', 'tencent': '/chat/completions',
      'qianfan': '/chat/completions', 'xfyun': '/chat',
      'minimax': '/text/chatcompletion_v2',
    };
    return base + (endpoints[provider] || '/chat/completions');
  };

  const fullUrl = getEndpoint(provider, baseUrl);
  const headers = { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) };

  const imgMatches = (content || '').match(/!\[.*?\]\((.*?)\)/g) || [];
  const imgUrls = imgMatches.map(m => {
    const match = m.match(/!\[.*?\]\((.*?)\)/);
    return match ? match[1] : '';
  }).filter(url => url.startsWith('http'));

  for (const imgUrl of imgUrls) {
    try {
      const imgRes = await fetch(`${baseUrl}/${modelId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: [{ type: 'text', text: `描述这张图片的内容，20字以内：` }, { type: 'image_url', image_url: { url: imgUrl } }] }],
          max_tokens: 80,
        })
      });
      const imgData = await imgRes.json();
      const desc = imgData.choices?.[0]?.message?.content?.trim() || '';
      if (desc && !imageDescs.includes(desc)) imageDescs.push(desc);
    } catch (e) { console.error('[AI] 图片识别失败', imgUrl, e.message); }
  }

  const stmt = db.prepare(`UPDATE documents SET image_descriptions = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`);
  stmt.run([JSON.stringify(imageDescs), id]);
  stmt.free();
  res.json({ imageDescriptions: imageDescs });
});

export default app;