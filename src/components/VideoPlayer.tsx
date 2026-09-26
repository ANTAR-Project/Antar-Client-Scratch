import { forwardRef } from 'react';
import QualitySelector from './QualitySelector';
import type { QualityLevel } from '../hooks/useHlsPlayer';

interface VideoPlayerProps {
  playerStatus: { msg: string; type: string };
  infoBox: {
    visible: boolean;
    nasPath: string;
    playlistPath: string;
    level: string;
    source: string;
  };
  levels: QualityLevel[];
  currentLevel: number;
  onSwitchQuality: (idx: number) => void;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ playerStatus, infoBox, levels, currentLevel, onSwitchQuality }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Status line */}
        {playerStatus.msg && (
          <div id="playerStatus" className={`status-line ${playerStatus.type || ''}`}>
            {playerStatus.msg}
          </div>
        )}

        {/* Video + Quality bar wrapped in one panel */}
        <div className="video-wrap">
          <video id="hlsVideo" ref={ref} controls />
          {/* Quality selector bar directly under the video, inside the rounded panel */}
          <QualitySelector
            levels={levels}
            currentLevel={currentLevel}
            onSwitch={onSwitchQuality}
          />
        </div>

        {/* Stream Info Grid */}
        {infoBox.visible && (
          <div id="infoBox" className="info-grid-wrap">
            <div className="info-grid-header">📡 Stream Info</div>
            <div className="info-grid">
              {[
                { label: 'Video NAS Path',    value: infoBox.nasPath,      mono: true,  id: 'infoNasPath'      },
                { label: 'HLS Playlist Path', value: infoBox.playlistPath, mono: true,  id: 'infoPlaylistPath' },
                { label: 'HLS Level',         value: infoBox.level,        mono: false, id: 'infoLevel'        },
                { label: 'Playlist Source',   value: infoBox.source,       mono: false, id: 'infoSource'       },
              ].map(({ label, value, mono, id }) => (
                <div key={id} className="info-cell">
                  <div className="info-cell-label">{label}</div>
                  <div id={id} className={`info-cell-value${mono ? ' mono' : ''}`}>
                    {value || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
