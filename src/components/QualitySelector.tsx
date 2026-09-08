import type { QualityLevel } from '../hooks/useHlsPlayer';

interface QualitySelectorProps {
  levels: QualityLevel[];
  currentLevel: number; // -1 = Auto
  onSwitch: (levelIndex: number) => void;
}

export default function QualitySelector({ levels, currentLevel, onSwitch }: QualitySelectorProps) {
  // Don't render if no levels yet (video not loaded)
  if (levels.length === 0) return null;

  return (
    <div className="quality-selector">
      <span className="quality-label">Quality</span>

      <div className="quality-pills">
        {/* Auto option */}
        <button
          className={`quality-pill auto${currentLevel === -1 ? ' active' : ''}`}
          onClick={() => onSwitch(-1)}
          title="Let HLS.js automatically choose the best quality for your connection"
        >
          Auto
        </button>

        {/* One pill per level, highest→lowest */}
        {levels.map((lvl) => {
          const isActive = currentLevel === lvl.index;
          const kbps     = Math.round(lvl.bitrate / 1000);
          return (
            <button
              key={lvl.index}
              className={`quality-pill${isActive ? ' active' : ''}`}
              onClick={() => onSwitch(lvl.index)}
              title={`${lvl.label} — ${kbps} kbps`}
            >
              {lvl.label}
              <span className="quality-bitrate">{kbps}k</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
