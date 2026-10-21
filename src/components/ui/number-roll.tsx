import { cn } from "./cn";

// Rolling digits, after the ObsidianUI analytics-dashboard number animation, in plain CSS (no motion library). Each
// digit is a reel of 0-9 that rolls from 0 to its value with a CSS animation, so the final number is right even
// before JavaScript runs or while the tab is hidden; a changed digit gets a new key and rolls again. Other characters
// (₹, commas, "L", "Cr", %) stay put. Screen readers get the plain text. Reduced motion skips the roll (globals.css).

export function NumberRoll({ value, className }: { value: string | number; className?: string }) {
  const text = String(value);
  const chars = [...text];
  return (
    <span className={cn("inline-flex tabular-nums", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex items-center leading-none">
        {chars.map((c, i) => {
          const digit = c >= "0" && c <= "9" ? Number(c) : null;
          if (digit === null) return <span key={`${i}-${c}`} className="leading-none">{c}</span>;
          return (
            <span key={`${chars.length - i}-${digit}`} className="relative inline-block h-[1em] overflow-hidden leading-none">
              <span className="invisible">{c}</span>
              <span
                className="absolute inset-x-0 top-0 flex animate-[cb-roll_0.9s_cubic-bezier(.2,.8,.2,1)_both] flex-col"
                style={{ transform: `translateY(-${digit * 10}%)`, animationDelay: `${i * 45}ms` }}
              >
                {Array.from({ length: 10 }, (_, n) => (
                  <span key={n} className="block h-[1em] text-center leading-none">{n}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
