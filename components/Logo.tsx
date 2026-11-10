import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export default function Logo({ size = 32, className = "", withGlow = true }: LogoProps) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {withGlow && (
        <span
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sky-500/30 via-indigo-500/20 to-emerald-500/30 blur-sm opacity-70 group-hover:opacity-100 transition duration-300"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className="relative drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Background Gradient */}
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#080e1a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Border Ring Gradient */}
          <linearGradient id="logoRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.85" />
          </linearGradient>

          {/* Main Trend Surge Gradient */}
          <linearGradient id="logoSurgeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#6366f1" />
            <stop offset="85%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          {/* Bar 1 Gradient */}
          <linearGradient id="logoBar1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
          </linearGradient>

          {/* Bar 2 Gradient */}
          <linearGradient id="logoBar2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.35" />
          </linearGradient>

          {/* Bar 3 Gradient */}
          <linearGradient id="logoBar3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.4" />
          </linearGradient>

          {/* Glow Effect */}
          <filter id="logoNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="logoSubtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Container Squircle Background */}
        <rect
          x="16"
          y="16"
          width="480"
          height="480"
          rx="112"
          fill="url(#logoBgGrad)"
          stroke="url(#logoRingGrad)"
          strokeWidth="12"
        />

        {/* Inner Ambient Glow Circles */}
        <circle cx="256" cy="230" r="160" fill="#38bdf8" opacity="0.08" filter="url(#logoNeonGlow)" />
        <circle cx="360" cy="160" r="110" fill="#10b981" opacity="0.09" filter="url(#logoNeonGlow)" />

        {/* Financial Candlestick Wicks & Bars */}
        {/* Bar 1 */}
        <line x1="135" y1="260" x2="135" y2="400" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
        <rect x="114" y="290" width="42" height="95" rx="10" fill="url(#logoBar1Grad)" stroke="#38bdf8" strokeWidth="2.5" strokeOpacity="0.6" />

        {/* Bar 2 */}
        <line x1="225" y1="190" x2="225" y2="400" stroke="#818cf8" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
        <rect x="204" y="225" width="42" height="160" rx="10" fill="url(#logoBar2Grad)" stroke="#818cf8" strokeWidth="2.5" strokeOpacity="0.7" />

        {/* Bar 3 */}
        <line x1="315" y1="130" x2="315" y2="400" stroke="#c084fc" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
        <rect x="294" y="165" width="42" height="220" rx="10" fill="url(#logoBar3Grad)" stroke="#c084fc" strokeWidth="2.5" strokeOpacity="0.8" />

        {/* Dynamic Upward Trend Wave with Ambient Glow */}
        <path
          d="M 85 365 C 160 365, 185 275, 260 235 C 315 205, 335 185, 405 125"
          fill="none"
          stroke="#10b981"
          strokeWidth="28"
          strokeLinecap="round"
          opacity="0.35"
          filter="url(#logoNeonGlow)"
        />

        <path
          d="M 85 365 C 160 365, 185 275, 260 235 C 315 205, 335 185, 405 125"
          fill="none"
          stroke="url(#logoSurgeGrad)"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Trend Arrowhead */}
        <path
          d="M 330 115 L 420 115 L 420 205"
          fill="none"
          stroke="url(#logoSurgeGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Decision & AI Sparkle (4-point Star) */}
        <g transform="translate(425, 105)" filter="url(#logoSubtleGlow)">
          <path
            d="M 0 -22 C 0 -6, 6 0, 22 0 C 6 0, 0 6, 0 22 C 0 6, -6 0, -22 0 C -6 0, 0 -6, 0 -22 Z"
            fill="#34d399"
          />
          <circle cx="0" cy="0" r="4.5" fill="#ffffff" />
        </g>

        {/* Pivot Node Pulse */}
        <circle cx="260" cy="235" r="7" fill="#ffffff" stroke="#6366f1" strokeWidth="3.5" filter="url(#logoSubtleGlow)" />
      </svg>
    </div>
  );
}
