import React, { useState } from 'react';
import type { JSX } from 'react';

/**
 * 批量导入组件属性接口
 */
interface BatchImportProps {
  /** 批量导入回调函数 */
  onImport: (urls: string[]) => void;
  /** 单个 URL 添加回调函数 */
  onAddSingle: (url: string) => void;
}

/**
 * 批量导入组件
 * 提供单个 URL 添加和批量 URL 导入功能
 * @param {BatchImportProps} props - 组件属性
 * @returns {JSX.Element} 组件 JSX 元素
 */
export function BatchImport({ onImport, onAddSingle }: BatchImportProps) {
  const [url, setUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  /**
   * 处理添加单个任务
   * @param {React.FormEvent} e - 表单提交事件
   */
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAddSingle(url.trim());
      setUrl('');
    }
  };

  /**
   * 处理批量导入
   * @param {React.FormEvent} e - 表单提交事件
   */
  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = bulkUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && u.startsWith('http'));
    
    if (urls.length > 0) {
      onImport(urls);
      setBulkUrls('');
      setShowBulk(false);
    }
  };

  return (
    <div className="batch-import">
      {!showBulk ? (
        <form onSubmit={handleAddSingle} className="single-import">
          <input
            type="text"
            placeholder="粘贴 YouTube URL..."
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            className="input-field"
          />
          <button type="submit" className="btn-primary">
            添加
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowBulk(true)}
          >
            批量导入
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkImport} className="bulk-import">
          <textarea
            placeholder="粘贴多个 YouTube URL，每行一个..."
            value={bulkUrls}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkUrls(e.target.value)}
            className="textarea-field"
            rows={6}
          />
          <div className="button-group">
            <button type="submit" className="btn-primary">
              导入 ({bulkUrls.split('\n').filter(u => u.trim()).length} 个)
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowBulk(false);
                setBulkUrls('');
              }}
            >
              取消
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
