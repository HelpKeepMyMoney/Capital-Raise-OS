export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,oklch(0.3_0.08_250/0.4),transparent_50%)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
