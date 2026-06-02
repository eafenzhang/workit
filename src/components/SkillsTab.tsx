import { useState, useEffect } from 'react';
import { apiFetch, API } from '../api';
import { ZapIcon, UploadIcon, TrashIcon } from 'lucide-react';
import { toast } from 'sonner';
import ImportModal from './ImportModal';

interface SkillItem {
  id: string;
  name: string;
  description: string;
  source: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
}

const SKILL_TEMPLATE = [
  { name: 'pdf-skill', description: 'PDF 文件处理', source: 'built-in', config: {} },
  { name: 'image-skill', description: '图片处理能力', source: 'marketplace', config: {} },
];

export default function SkillsTab({ hideToolbar }: { hideToolbar?: boolean }) {
  const [items, setItems] = useState<SkillItem[]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = () => {
    apiFetch(API.skills)
      .then((r: any) => r.json())
      .then((data: SkillItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const toggleItem = (item: SkillItem) => {
    apiFetch(API.skillsById(item.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !item.enabled }),
    }).then(() => {
      fetchItems();
      toast.success(item.enabled ? '已禁用' : '已启用');
    });
  };

  const deleteItem = (id: string) => {
    if (!confirm('确定删除？')) return;
    apiFetch(API.skillsById(id), { method: 'DELETE' }).then(() => {
      fetchItems();
      toast.success('已删除');
    });
  };

  const sourceLabels: Record<string, string> = {
    'built-in': '内置',
    marketplace: '市场',
    custom: '自定义',
    url: 'URL',
  };

  return (
    <div className="flex flex-col">
      {/* Toolbar — import top-right */}
      {!hideToolbar && (
      <div className="flex items-center justify-end gap-2 px-8 py-3">
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
          <UploadIcon size={14} />一键导入
        </button>
      </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 mx-8 rounded-lg"
          style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
        >
          <ZapIcon size={48} style={{ color: 'var(--wiki-text3)' }} />
          <p className="mt-4 text-wiki-text2 text-sm">暂无 Skill 技能</p>
          <p className="mt-1 text-wiki-text3 text-xs">
            点击「一键导入」快速添加，或手动配置
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-3 px-8 pb-8">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg p-4"
            style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: item.enabled ? 'rgba(99,102,241,0.12)' : 'var(--wiki-surface2)',
                }}
              >
                <ZapIcon
                  size={18}
                  style={{ color: item.enabled ? '#6366f1' : 'var(--wiki-text3)' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-wiki-text">{item.name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text3)' }}
                  >
                    {sourceLabels[item.source] || item.source}
                  </span>
                </div>
                {item.description && (
                  <div className="text-xs text-wiki-text3 mt-0.5 line-clamp-1">
                    {item.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => toggleItem(item)}
                  className="px-3 py-1.5 rounded text-xs font-medium"
                  style={{
                    background: item.enabled ? 'var(--wiki-danger-bg)' : 'rgba(16,185,129,0.12)',
                    color: item.enabled ? 'var(--wiki-danger)' : '#10b981',
                  }}
                >
                  {item.enabled ? '禁用' : '启用'}
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1.5 rounded hover:bg-wiki-surface2"
                >
                  <TrashIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchItems}
        apiPrefix={API.skills}
        title="导入 Skill"
        template={SKILL_TEMPLATE}
      />
    </div>
  );
}
