export default function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050816]" />

      <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />

      <div className="absolute left-[12%] top-[18%] h-1 w-1 rounded-full bg-white/80" />
      <div className="absolute left-[28%] top-[12%] h-1.5 w-1.5 rounded-full bg-blue-300/80" />
      <div className="absolute right-[18%] top-[22%] h-1 w-1 rounded-full bg-white/70" />
      <div className="absolute right-[10%] top-[40%] h-1.5 w-1.5 rounded-full bg-blue-400/70" />
      <div className="absolute left-[16%] top-[52%] h-1 w-1 rounded-full bg-white/60" />
      <div className="absolute right-[24%] top-[62%] h-1 w-1 rounded-full bg-purple-300/70" />
      <div className="absolute left-[8%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-blue-300/70" />
      <div className="absolute right-[12%] bottom-[12%] h-1 w-1 rounded-full bg-white/70" />

      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-blue-950/30 to-transparent" />
    </div>
  );
}