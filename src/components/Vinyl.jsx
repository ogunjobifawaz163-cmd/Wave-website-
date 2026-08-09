export default function Vinyl({ src, size = 220, spinning = false, className = '', fast = false }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className={`absolute inset-0 rounded-full vinyl-disc vinyl-shine ${spinning ? (fast ? 'spin-fast' : 'spin-vinyl') : ''}`}
      >
        {/* label */}
        <div
          className="absolute rounded-full overflow-hidden border-2 border-white/20 shadow-inner"
          style={{ inset: '27%' }}
        >
          {src ? (
            <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full" style={{ background: 'radial-gradient(circle, #55b0ff, #123f7a)' }} />
          )}
        </div>
        {/* spindle hole */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[6%] h-[6%] rounded-full bg-slate-950 ring-2 ring-slate-700" />
      </div>
    </div>
  );
}
