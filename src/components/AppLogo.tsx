import React from "react";

export function AppLogo({
  dark = false,
  compact = false,
  className = "",
}: {
  dark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const titleClass = dark ? "text-white" : "text-primary-600";
  const subtitleClass = dark ? "text-slate-300" : "text-slate-500";

  return (
    <div className={className}>
      <div className={`font-extrabold tracking-tight ${compact ? "text-xl" : "text-2xl"} ${titleClass}`}>
        SWC
      </div>
      {!compact && (
        <p className={`mt-0.5 text-xs ${subtitleClass}`}>Smart School Cloud Platform</p>
      )}
    </div>
  );
}

