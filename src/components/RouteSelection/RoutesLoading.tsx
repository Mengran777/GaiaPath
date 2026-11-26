"use client";

import React, { useEffect, useState } from "react";
import Lozenge from "../UI/Lozenge";

// What the wait is "doing", shown one at a time so the screen visibly moves on
const STEPS = [
  "Reading the map",
  "Choosing the stops",
  "Checking opening hours",
  "Balancing each day",
  "Writing it up",
];
const STEP_MS = 3200;

/**
 * Shown while routes generate. Three lozenges step in turn, a hairline fills
 * over the expected wait, and a short status line changes every few seconds.
 * The bar eases toward 92% and never claims to be done before the routes are.
 */
const RoutesLoading: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-full overflow-hidden flex flex-col items-center pt-10" role="status" aria-live="polite">
      <div className="flex gap-3.5 mb-7" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="loz-step" style={{ animationDelay: `${i * 0.25}s` }}>
            <Lozenge className="w-[14px] h-[14px] text-ink" />
          </span>
        ))}
      </div>

      <h2 className="font-display text-[44px] leading-[1.04] uppercase text-center text-ink">
        Composing<br />your routes
      </h2>

      <div className="mt-8 w-full max-w-[360px]">
        <div className="h-px bg-line overflow-hidden" aria-hidden="true">
          <div className="h-full w-full bg-ink routes-progress" />
        </div>
        <p key={step} className="mt-3 text-center text-sm text-ink-soft animate-card-enter">
          {STEPS[step]}…
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-muted">Three options, usually ready in 10 to 20 seconds.</p>

      <div className="w-full max-w-[1040px] mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
            <div className="aspect-[4/5] bg-surface-dim" />
            <div className="h-2.5 w-1/3 mt-4 bg-surface-dim" />
            <div className="h-4 w-2/3 mt-2.5 bg-surface-dim" />
            <div className="h-2.5 w-11/12 mt-2.5 bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoutesLoading;
