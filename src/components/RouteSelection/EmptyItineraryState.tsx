"use client";

import React, { useState, useRef, useCallback } from "react";

interface EmptyItineraryStateProps {
  onBackToInitial?: () => void;
  onSelectDestination?: (city: string) => void;
}

const DESTINATIONS = [
  {
    city: "Paris",
    country: "France",
    emoji: "🗼",
    s1: "#7b6fd4",
    s2: "#9d92e8",
    sf: "#4a3fa0",
    glow: "rgba(123,111,212,0.5)",
  },
  {
    city: "Athens",
    country: "Greece",
    emoji: "🏛️",
    s1: "#c9a96e",
    s2: "#e0c48a",
    sf: "#a0883e",
    glow: "rgba(201,169,110,0.5)",
  },
  {
    city: "Kyoto",
    country: "Japan",
    emoji: "⛩️",
    s1: "#d4706f",
    s2: "#e89190",
    sf: "#a04040",
    glow: "rgba(212,112,111,0.5)",
  },
  {
    city: "Bali",
    country: "Indonesia",
    emoji: "🌴",
    s1: "#3d9e72",
    s2: "#5dcaa5",
    sf: "#1a6b4a",
    glow: "rgba(61,158,114,0.5)",
  },
  {
    city: "New York",
    country: "USA",
    emoji: "🗽",
    s1: "#4a8fc5",
    s2: "#6ab0e8",
    sf: "#2a5f95",
    glow: "rgba(74,143,197,0.5)",
  },
  {
    city: "Queenstown",
    country: "NZ",
    emoji: "🏔️",
    s1: "#8a6fd4",
    s2: "#b090e8",
    sf: "#5a3fa0",
    glow: "rgba(138,111,212,0.5)",
  },
];

// ── Mini contour SVG for each destination card ──────────────────────────────
function CardContours({
  s1,
  s2,
  sf,
  bright,
}: {
  s1: string;
  s2: string;
  sf: string;
  bright: boolean;
}) {
  const op = bright ? 1.6 : 1; // multiply opacity when hovered
  return (
    <svg
      className="absolute inset-0 w-full h-full transition-opacity duration-300"
      viewBox="0 0 160 110"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ opacity: bright ? 1 : 0.75 }}
    >
      <ellipse cx="80" cy="95" rx="130" ry="48" fill="none" stroke={sf} strokeWidth="0.55" opacity={0.18 * op} transform="rotate(-4,80,95)" />
      <ellipse cx="80" cy="84" rx="112" ry="42" fill="none" stroke={sf} strokeWidth="0.55" opacity={0.2 * op} transform="rotate(-4,80,84)" />
      <ellipse cx="80" cy="72" rx="92" ry="35" fill="none" stroke={s1} strokeWidth="0.65" opacity={0.28 * op} transform="rotate(-7,80,72)" />
      <ellipse cx="80" cy="60" rx="74" ry="28" fill="none" stroke={s1} strokeWidth="0.65" opacity={0.3 * op} transform="rotate(-7,80,60)" />
      {/* index contour */}
      <ellipse cx="80" cy="48" rx="57" ry="22" fill="none" stroke={s2} strokeWidth="1.0" opacity={0.44 * op} transform="rotate(-10,80,48)" />
      <ellipse cx="80" cy="40" rx="42" ry="17" fill="none" stroke={s1} strokeWidth="0.65" opacity={0.34 * op} transform="rotate(-10,80,40)" />
      <ellipse cx="80" cy="33" rx="29" ry="12" fill="none" stroke={s1} strokeWidth="0.65" opacity={0.36 * op} transform="rotate(-12,80,33)" />
      {/* index contour near peak */}
      <ellipse cx="80" cy="27" rx="18" ry="8" fill="none" stroke={s2} strokeWidth="1.05" opacity={0.52 * op} transform="rotate(-12,80,27)" />
      <ellipse cx="80" cy="23" rx="9" ry="4.5" fill="none" stroke={s2} strokeWidth="0.9" opacity={0.58 * op} transform="rotate(-12,80,23)" />
    </svg>
  );
}

// ── Main terrain contour SVG for card background ─────────────────────────────
// Design: main peak is off-screen upper-right (~820, -40).
// Each contour is an organic open arc entering from the left/bottom edge and
// exiting through the right/top edge, wrapping around that off-screen peak.
// A spur ridge runs SW from the peak → causes a downward bulge at x≈570-650.
// A valley re-entrant from the south → causes an upward dip at x≈460-500.
// These correlated features give the lines their topographic character.
// Secondary mountain: 4 organic closed-path loops (no perfect ellipses),
// peak ~(165,325).  Bottom ridge: 2 shallow open arcs.
function TerrainSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 800 440"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* ── Main mountain – 9 contours, low → high ── */}

      {/* L1 – outermost, faint */}
      <path
        d="M0,424 C65,419 140,412 212,404 C285,396 358,387 424,376
           C488,365 548,354 604,343 C654,333 706,323 756,314
           C778,309 798,305 800,304"
        fill="none" stroke="#1a6b5e" strokeWidth="0.5" opacity="0.15"
      />
      {/* L2 */}
      <path
        d="M0,408 C58,401 132,393 206,383 C282,372 358,360 428,347
           C494,334 555,321 610,308 C657,297 707,285 756,274
           C778,268 798,263 800,261"
        fill="none" stroke="#1a6b5e" strokeWidth="0.5" opacity="0.18"
      />
      {/* L3 – INDEX */}
      <path
        d="M0,388 C50,379 124,368 200,355 C280,341 358,325 432,310
           C498,296 560,281 618,266 C662,253 710,240 758,227
           C778,221 797,217 800,216"
        fill="none" stroke="#2d9e8a" strokeWidth="1.0" opacity="0.34"
      />
      {/* L4 – valley dip ~x480, spur bulge ~x610 */}
      <path
        d="M0,364 C40,352 112,338 190,320 C274,302 354,282 422,264
           C454,254 476,248 494,244 C514,240 536,233 560,226
           C582,220 616,214 650,207 C692,198 744,188 800,178"
        fill="none" stroke="#2d9e8a" strokeWidth="0.68" opacity="0.26"
      />
      {/* L5 – valley/spur more pronounced */}
      <path
        d="M0,334 C28,318 96,298 172,276 C260,252 338,226 408,204
           C444,191 472,183 490,175 C512,167 536,160 560,154
           C586,148 620,141 654,135 C696,126 748,114 800,104"
        fill="none" stroke="#2d9e8a" strokeWidth="0.68" opacity="0.28"
      />
      {/* L6 – INDEX, valley + spur clearly visible */}
      <path
        d="M0,298 C16,276 78,250 154,225 C244,197 326,167 396,142
           C432,128 464,116 484,108 C506,100 530,92 556,86
           C580,80 616,73 652,66 C695,56 745,43 800,32"
        fill="none" stroke="#5dcaa5" strokeWidth="1.05" opacity="0.44"
      />
      {/* L7 – features compress near peak */}
      <path
        d="M0,254 C6,228 60,196 134,168 C224,136 308,104 376,78
           C412,63 444,50 462,41 C482,32 506,25 528,20
           C552,14 584,7 618,1 C652,-7 702,-21 754,-37
           C776,-45 798,-51 800,-52"
        fill="none" stroke="#2d9e8a" strokeWidth="0.7" opacity="0.3"
      />
      {/* L8 – INDEX */}
      <path
        d="M0,202 C0,170 46,132 114,100 C198,64 282,34 348,8
           C382,-6 410,-16 428,-24 C450,-32 470,-38 492,-43
           C514,-48 542,-54 572,-61 C606,-69 646,-79 692,-91
           C728,-99 768,-109 800,-115"
        fill="none" stroke="#5dcaa5" strokeWidth="1.05" opacity="0.40"
      />
      {/* L9 – highest visible arc, tight near peak */}
      <path
        d="M0,142 C0,104 28,62 86,30 C158,-6 232,-34 296,-58
           C328,-70 354,-78 372,-84 C390,-90 408,-95 424,-99
           C444,-104 466,-109 490,-113"
        fill="none" stroke="#2d9e8a" strokeWidth="0.65" opacity="0.22"
      />

      {/* ── Secondary mountain – organic closed loops, peak ~(165,325) ──
           Loops are asymmetric: steeper on the E face, gentler on the W.
           Every alternate ring is an index contour.                      */}

      {/* Ring 1 – innermost, INDEX */}
      <path
        d="M158,314 C163,308 171,307 177,313 C183,319 183,328 178,336
           C173,344 163,346 154,340 C145,334 143,323 147,316
           C150,310 154,308 158,314 Z"
        fill="none" stroke="#5dcaa5" strokeWidth="0.95" opacity="0.50"
      />
      {/* Ring 2 – elongated slightly SW, steeper E side */}
      <path
        d="M153,299 C163,287 179,283 193,290 C207,297 214,312 211,327
           C208,342 197,353 183,356 C169,359 155,352 146,340
           C137,328 137,310 144,301 C147,297 150,296 153,299 Z"
        fill="none" stroke="#2d9e8a" strokeWidth="0.65" opacity="0.34"
      />
      {/* Ring 3 – INDEX, organic bump on NE side from a minor spur */}
      <path
        d="M155,282 C169,268 188,263 204,270 C220,277 232,296 232,316
           C232,336 222,354 206,362 C190,370 170,368 154,358
           C138,348 128,330 130,310 C132,290 143,278 152,276
           C153,275 154,277 155,282 Z"
        fill="none" stroke="#5dcaa5" strokeWidth="1.0" opacity="0.40"
      />
      {/* Ring 4 – outermost secondary, widest toward SW */}
      <path
        d="M156,264 C174,246 198,238 220,244 C242,250 260,270 264,296
           C268,322 258,350 240,364 C222,378 198,382 176,374
           C154,366 136,346 128,322 C120,298 124,274 136,262
           C142,256 148,254 156,264 Z"
        fill="none" stroke="#2d9e8a" strokeWidth="0.62" opacity="0.26"
      />

      {/* ── Bottom ridge – low elongated hill at valley floor ── */}
      <path
        d="M100,440 C190,429 290,421 390,417 C490,413 588,417 675,428
           C718,434 762,440 800,440"
        fill="none" stroke="#2d9e8a" strokeWidth="0.6" opacity="0.22"
      />
      {/* inner ridge – INDEX */}
      <path
        d="M195,440 C270,429 356,421 440,418 C524,415 602,419 668,429
           C700,435 740,440 800,440"
        fill="none" stroke="#5dcaa5" strokeWidth="0.9" opacity="0.30"
      />
    </svg>
  );
}

// ── Globe SVG ────────────────────────────────────────────────────────────────
function GlobeSVG({ isHovered }: { isHovered: boolean }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 100, height: 100 }}
    >
      {/* Orbit ring – visible on hover */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
      >
        <svg width="100" height="100" viewBox="0 0 100 100">
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="46"
            fill="none"
            stroke="#2d9e8a"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.55"
          />
        </svg>
        {/* Orbiting dot */}
        <div
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            width: 0,
            height: 0,
            animation: "orbit-spin 5s linear infinite",
            transformOrigin: "0 0",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -46,
              left: -3,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#5dcaa5",
              boxShadow: "0 0 7px 2px rgba(93,202,165,0.8)",
            }}
          />
        </div>
      </div>

      {/* Globe SVG */}
      <div
        style={{
          transform: isHovered
            ? "scale(1.1) rotate(10deg)"
            : "scale(1) rotate(0deg)",
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <svg width="72" height="72" viewBox="0 0 72 72">
          <defs>
            <clipPath id="globe-clip-eis">
              <circle cx="36" cy="36" r="29" />
            </clipPath>
            <radialGradient id="globe-bg-eis" cx="38%" cy="36%" r="62%">
              <stop offset="0%" stopColor="#0d2e24" />
              <stop offset="100%" stopColor="#061a14" />
            </radialGradient>
          </defs>

          {/* Outer glow */}
          <circle cx="36" cy="36" r="34" fill="rgba(45,158,138,0.06)" />
          {/* Globe body */}
          <circle cx="36" cy="36" r="29" fill="url(#globe-bg-eis)" />
          {/* Rim */}
          <circle cx="36" cy="36" r="29" fill="none" stroke="#2d9e8a" strokeWidth="1" opacity="0.6" />

          {/* Grid lines clipped to globe */}
          <g clipPath="url(#globe-clip-eis)">
            {/* Latitude lines */}
            <ellipse cx="36" cy="36" rx="29" ry="7" fill="none" stroke="#1a6b5e" strokeWidth="0.8" opacity="0.65" />
            <ellipse cx="36" cy="25" rx="23" ry="5.5" fill="none" stroke="#1a6b5e" strokeWidth="0.7" opacity="0.5" />
            <ellipse cx="36" cy="47" rx="23" ry="5.5" fill="none" stroke="#1a6b5e" strokeWidth="0.7" opacity="0.5" />
            <ellipse cx="36" cy="16" rx="13" ry="3.5" fill="none" stroke="#1a6b5e" strokeWidth="0.6" opacity="0.38" />
            <ellipse cx="36" cy="56" rx="13" ry="3.5" fill="none" stroke="#1a6b5e" strokeWidth="0.6" opacity="0.38" />
            {/* Longitude lines */}
            <ellipse cx="36" cy="36" rx="9" ry="29" fill="none" stroke="#2d9e8a" strokeWidth="0.75" opacity="0.5" />
            <ellipse cx="36" cy="36" rx="9" ry="29" fill="none" stroke="#2d9e8a" strokeWidth="0.75" opacity="0.45" transform="rotate(55,36,36)" />
            <ellipse cx="36" cy="36" rx="9" ry="29" fill="none" stroke="#2d9e8a" strokeWidth="0.75" opacity="0.45" transform="rotate(110,36,36)" />
          </g>

          {/* Gold marker dots */}
          <circle cx="43" cy="27" r="2.4" fill="#c9a96e" />
          <circle cx="27" cy="38" r="1.9" fill="#c9a96e" />
          <circle cx="49" cy="44" r="1.9" fill="#c9a96e" />

          {/* Highlight shimmer */}
          <ellipse cx="26" cy="23" rx="7" ry="5" fill="rgba(255,255,255,0.05)" transform="rotate(-30,26,23)" />
        </svg>
      </div>
    </div>
  );
}

// ── Destination card ──────────────────────────────────────────────────────────
interface DestCardProps {
  city: string;
  country: string;
  emoji: string;
  s1: string;
  s2: string;
  sf: string;
  glow: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

function DestinationCard({
  city,
  country,
  emoji,
  s1,
  s2,
  sf,
  glow,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: DestCardProps) {
  return (
    <div
      className="relative flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl"
      style={{
        width: 118,
        height: 96,
        background: "rgba(8,24,18,0.88)",
        transform: isHovered
          ? "translateY(-6px) scale(1.04)"
          : "translateY(0) scale(1)",
        transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Contour background */}
      <CardContours s1={s1} s2={s2} sf={sf} bright={isHovered} />

      {/* Bottom radial glow pulse */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 56,
          background: `radial-gradient(ellipse at 50% 100%, ${glow} 0%, transparent 72%)`,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          animation: isHovered ? "card-glow-pulse 1.6s ease-in-out infinite" : "none",
        }}
      />

      {/* Shimmer sweep */}
      {isHovered && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(108deg, transparent 28%, rgba(255,255,255,0.07) 50%, transparent 72%)",
            animation: "shimmer-sweep 0.75s ease-in-out",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1">
        <span
          style={{
            fontSize: 26,
            display: "block",
            transform: isHovered
              ? "scale(1.2) rotate(-7deg)"
              : "scale(1) rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {emoji}
        </span>
        <span
          className="font-semibold text-xs leading-none"
          style={{ color: "rgba(225,240,235,0.92)" }}
        >
          {city}
        </span>
        <span
          className="text-[10px] leading-none"
          style={{ color: "rgba(93,202,165,0.55)" }}
        >
          {country}
        </span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function EmptyItineraryState({
  onBackToInitial,
  onSelectDestination,
}: EmptyItineraryStateProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouseGlow, setMouseGlow] = useState({ x: 50, y: 50 });
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isPlanBtnHovered, setIsPlanBtnHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMouseGlow({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    []
  );

  const handleSelectDestination = useCallback(
    (city: string) => {
      onSelectDestination?.(city);
      onBackToInitial?.();
    },
    [onSelectDestination, onBackToInitial]
  );

  return (
    <div
      ref={cardRef}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: "#06120f" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Terrain contour lines */}
      <TerrainSVG />

      {/* Edge vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 25%, rgba(6,18,15,0.45) 65%, rgba(6,18,15,0.82) 100%)",
        }}
      />

      {/* Mouse-follow glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 280px at ${mouseGlow.x}% ${mouseGlow.y}%, rgba(45,158,138,0.11) 0%, transparent 70%)`,
          opacity: isCardHovered ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-6 pt-10 pb-8">
        {/* Globe */}
        <div className="mb-4">
          <GlobeSVG isHovered={isCardHovered} />
        </div>

        {/* Title */}
        <h2
          className="text-[22px] font-bold mb-2"
          style={{ color: "rgba(232,244,240,0.95)" }}
        >
          No itineraries yet
        </h2>

        {/* Subtitle */}
        <p
          className="text-sm text-center mb-5 max-w-[260px] leading-relaxed"
          style={{ color: "rgba(165,205,192,0.62)" }}
        >
          Fill in your preferences and let AI craft your perfect journey.
        </p>

        {/* Three-step pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
          {[
            { icon: "✏️", label: "Describe" },
            { icon: "📍", label: "Destination" },
            { icon: "✨", label: "Generate" },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(45,158,138,0.1)",
                  border: "1px solid rgba(45,158,138,0.22)",
                  color: "rgba(175,218,206,0.82)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span>{step.icon}</span>
                <span>{step.label}</span>
              </span>
              {i < 2 && (
                <span style={{ color: "rgba(45,158,138,0.38)", fontSize: 13 }}>
                  +
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Plan a trip button */}
        {onBackToInitial && (
          <div className="relative mb-8 flex items-center justify-center">
            {/* Pulse rings */}
            {!isPlanBtnHovered && (
              <>
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    inset: -4,
                    background: "rgba(45,158,138,0.22)",
                    animation: "pulse-glow-eis 2.2s ease-in-out infinite",
                  }}
                />
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    inset: -10,
                    background: "rgba(45,158,138,0.12)",
                    animation:
                      "pulse-glow-eis 2.2s ease-in-out infinite 0.5s",
                  }}
                />
              </>
            )}
            <button
              onClick={onBackToInitial}
              onMouseEnter={() => setIsPlanBtnHovered(true)}
              onMouseLeave={() => setIsPlanBtnHovered(false)}
              className="relative flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{
                background: "transparent",
                border: "1px solid rgba(45,158,138,0.4)",
                color: "rgba(175,228,212,0.92)",
                transition: "border-color 0.2s ease, color 0.2s ease",
              }}
            >
              Plan a trip
              <span
                style={{
                  display: "inline-block",
                  transform: isPlanBtnHovered
                    ? "translateX(4px)"
                    : "translateX(0)",
                  transition: "transform 0.2s ease",
                }}
              >
                →
              </span>
            </button>
          </div>
        )}

        {/* Divider + label */}
        <div className="flex items-center gap-3 w-full max-w-[560px] mb-5">
          <div
            className="flex-1 h-px"
            style={{ background: "rgba(45,158,138,0.16)" }}
          />
          <span
            className="text-[10px] tracking-[0.2em] font-medium uppercase"
            style={{ color: "rgba(93,202,165,0.48)" }}
          >
            Popular Destinations
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "rgba(45,158,138,0.16)" }}
          />
        </div>

        {/* Destination cards */}
        <div
          className="flex gap-3 overflow-x-auto pb-1 w-full max-w-[780px]"
          style={{ scrollbarWidth: "none" }}
        >
          {DESTINATIONS.map((dest, i) => (
            <DestinationCard
              key={dest.city}
              {...dest}
              isHovered={hoveredCard === i}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleSelectDestination(dest.city)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
