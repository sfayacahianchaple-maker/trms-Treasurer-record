export default function Loading({ label = 'Loading...' }) {
  return (
    <div className="loading-box">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}
