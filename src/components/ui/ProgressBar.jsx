export default function ProgressBar({ value = 0 }) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className="progress">
      <div className="progress__bar" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
