"use client";

import React, { useState, useEffect } from "react";
import { Clock, Zap, CheckCircle2 } from "lucide-react";

interface CountdownTimerProps {
  targetIso?: string | null;
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
  prefix?: string;
}

export function CountdownTimer({
  targetIso,
  onExpire,
  className = "",
  compact = false,
  prefix = "Starts in",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    if (!targetIso) {
      setTimeLeft(null);
      return;
    }

    const calc = () => {
      const target = new Date(targetIso).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: diff,
          isPast: true,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff, isPast: false });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  if (!targetIso || !timeLeft) {
    return null;
  }

  if (timeLeft.isPast) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 font-mono ${className}`}>
        <Zap size={12} className="text-amber-400 animate-pulse" /> Live / Ready
      </span>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  let displayStr = "";
  if (timeLeft.days > 0) {
    displayStr = `${timeLeft.days}d ${timeLeft.hours}h ${pad(timeLeft.minutes)}m`;
  } else if (timeLeft.hours > 0) {
    displayStr = `${timeLeft.hours}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`;
  } else {
    displayStr = `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] text-[#d6a735] ${className}`}>
        <Clock size={11} className="text-[#d6a735]" />
        {displayStr}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#d6a735]/15 border border-[#d6a735]/40 text-[#d6a735] rounded-full text-xs font-mono font-bold ${className}`}
    >
      <Clock size={12} className="text-[#d6a735] animate-pulse" />
      <span>{prefix} {displayStr}</span>
    </span>
  );
}

export default CountdownTimer;
