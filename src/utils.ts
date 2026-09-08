export function getIcon(name: string, isDir: boolean): string {
  if (isDir) return '📁';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬', webm: '🎬', ts: '🎬',
    m3u8: '📡',
    pdf: '📄',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
    zip: '📦', tar: '📦', gz: '📦', rar: '📦', '7z': '📦',
    md: '📝', txt: '📝',
    json: '🔧', xml: '🔧', yaml: '🔧', yml: '🔧',
    js: '💻', py: '💻', java: '💻', html: '💻', css: '💻',
    sh: '⚙️', bat: '⚙️',
    doc: '📋', docx: '📋', xls: '📋', xlsx: '📋', ppt: '📋', pptx: '📋',
  };
  return map[ext] || '📄';
}

export function isPreviewable(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mp3', 'txt', 'md', 'json', 'xml', 'html', 'css', 'js'].includes(ext);
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(ms: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    '  ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function joinPath(base: string, name: string): string {
  const cleanBase = base ? base.replace(/\/$/, '') : '';
  const cleanName = name.replace(/\/$/, '');
  return cleanBase ? `${cleanBase}/${cleanName}` : cleanName;
}
