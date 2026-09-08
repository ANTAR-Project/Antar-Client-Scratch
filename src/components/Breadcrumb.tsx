interface BreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({ currentPath, onNavigate }: BreadcrumbProps) {
  const segments = currentPath
    ? currentPath.replace(/\/$/, '').split('/').filter(Boolean)
    : [];

  return (
    <div id="breadcrumb" className="breadcrumb">
      {segments.length === 0 ? (
        <span className="breadcrumb-seg-current">🏠 My NAS</span>
      ) : (
        <>
          <span className="breadcrumb-seg" onClick={() => onNavigate('')}>🏠 My NAS</span>
          {segments.map((seg, i) => {
            const builtPath = segments.slice(0, i + 1).join('/');
            const isLast    = i === segments.length - 1;
            return (
              <span key={builtPath} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="breadcrumb-arrow">›</span>
                {isLast
                  ? <span className="breadcrumb-seg-current">{seg}</span>
                  : <span className="breadcrumb-seg" onClick={() => onNavigate(builtPath)}>{seg}</span>
                }
              </span>
            );
          })}
        </>
      )}
    </div>
  );
}
