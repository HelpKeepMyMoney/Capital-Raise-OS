export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark:bg-[radial-gradient(ellipse_120%_90%_at_50%_-25%,oklch(0.38_0.11_198/0.55),transparent_55%),radial-gradient(ellipse_90%_55%_at_50%_110%,oklch(0.32_0.07_228/0.35),transparent_50%)]">
      <div
        data-slot="card"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-2xl backdrop-blur-xl dark:shadow-[0_25px_80px_-20px_oklch(0.18_0.06_235/0.55)]"
      >
        {children}
      </div>
    </div>
  );
}
