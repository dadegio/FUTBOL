type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "destructive";
  size?: "default" | "sm";
};

const base =
  "inline-flex items-center justify-center rounded-2xl font-black transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.98]";

const variants = {
  primary:
    "bg-[var(--accent)] text-black shadow-[0_10px_30px_rgba(0,210,106,0.22)] hover:bg-[var(--accent-2)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--card-2)] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]",
  destructive:
    "border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/18",
} as const;

const sizes = {
  default: "px-5 py-2.5 text-sm",
  sm: "px-3.5 py-2 text-xs",
} as const;

export default function Button({ variant = "primary", size = "default", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
