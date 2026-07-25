type PrimaryButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        w-full
        rounded-2xl
        bg-gradient-to-r
        from-[#0052FF]
        to-[#3B82F6]
        py-4
        text-lg
        font-bold
        text-white
        transition-all
        duration-300
        hover:scale-[1.02]
        hover:shadow-[0_0_40px_rgba(0,82,255,.45)]
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-50
      "
    >
      {children}
    </button>
  );
}