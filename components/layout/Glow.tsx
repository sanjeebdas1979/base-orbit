type GlowProps = {
  className?: string;
};

export default function Glow({ className = "" }: GlowProps) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full bg-blue-500/20 blur-[110px] ${className}`}
    />
  );
}