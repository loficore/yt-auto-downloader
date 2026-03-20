import { useState } from "react";
import type { PlaylistSyncResult } from "@yt-auto-downloader/shared";
import type {JSX} from "react";

interface PlaylistSyncProps {
  onSync: (playlistUrl: string) => Promise<PlaylistSyncResult | null>;
}

/**
 * 播放列表同步组件 - 始终显示输入框
 * @param {PlaylistSyncProps} param0 组件属性
 * @returns {JSX.Element} 渲染的播放列表同步组件
 */
export function PlaylistSync({ onSync }: PlaylistSyncProps) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<PlaylistSyncResult | null>(null);

  const handleSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim() || syncing) return;

    setSyncing(true);
    setResult(null);

    void (async () => {
      const syncResult = await onSync(playlistUrl.trim());
      setResult(syncResult);
      setSyncing(false);
    })();
  };

  return (
    <div className="playlist-sync">
      <h3>🔄 同步播放列表</h3>
      
      <form onSubmit={handleSync} className="flex flex-col gap-4">
        <textarea
          placeholder="粘贴 YouTube 播放列表链接..."
          value={playlistUrl}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setPlaylistUrl(e.target.value)
          }
          className="textarea-field"
          disabled={syncing}
          rows={4}
        />
        
        <button
          type="submit"
          className="btn-primary"
          disabled={syncing || !playlistUrl.trim()}
        >
          {syncing ? "🔄 同步中..." : "开始同步"}
        </button>
      </form>

      {result && (
        <div className="sync-result">
          <p>✅ 同步完成</p>
          <ul>
            <li>新添加: {result.added} 个任务</li>
            <li>总视频: {result.total} 个</li>
            <li>已下载: {result.downloaded} 个</li>
          </ul>
        </div>
      )}
    </div>
  );
}
