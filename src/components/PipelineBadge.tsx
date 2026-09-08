export default function PipelineBadge() {
  return (
    <div className="pipeline-card">
      <span className="pipeline-label">Pipeline</span>
      <span className="pipeline-node">video-service :8082</span>
      <span className="pipeline-arrow">→</span>
      <span className="pipeline-node">encoding-service</span>
      <span className="pipeline-arrow">→</span>
      <span className="pipeline-node">TrueNAS SMB</span>
      <span className="pipeline-arrow">→</span>
      <span className="pipeline-node-active">streaming-service :8084</span>
      <span className="pipeline-arrow">→</span>
      <span className="pipeline-node-active">nas-orchestrator :8081</span>
      <span className="pipeline-arrow">→</span>
      <span className="pipeline-node-active">▶ browser</span>
    </div>
  );
}
