'use client';

import React, { useEffect, useState } from 'react';
import { designTokens } from '@/lib/design-tokens';
import { SignalType } from '@/lib/types';

interface ConfidenceGaugeProps {
  confidence: number; // 0-100
  signal: SignalType;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const getSignalColor = (signal: SignalType): string => {
  const { signals } = designTokens.colors;
  switch (signal) {
    case 'STRONG_BUY':
      return signals.strongBuy;
    case 'BUY':
      return signals.buy;
    case 'HOLD':
      return signals.hold;
    case 'SELL':
      return signals.sell;
    case 'STRONG_SELL':
      return signals.strongSell;
  }
};

const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return { diameter: 64, strokeWidth: 4, fontSize: '0.875rem' };
    case 'md':
      return { diameter: 120, strokeWidth: 8, fontSize: '1.25rem' };
    case 'lg':
      return { diameter: 180, strokeWidth: 12, fontSize: '1.875rem' };
  }
};

export default function ConfidenceGauge({
  confidence,
  signal,
  size = 'md',
  animate = true,
}: ConfidenceGaugeProps) {
  const [displayConfidence, setDisplayConfidence] = useState(animate ? 0 : confidence);
  const { diameter, strokeWidth, fontSize } = getSizeConfig(size);
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayConfidence / 100) * circumference;
  const color = getSignalColor(signal);

  // Animate confidence value
  useEffect(() => {
    if (!animate) return;

    let start = 0;
    const duration = 800; // ms
    const startTime = Date.now();

    const animateValue = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOutCubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * confidence);

      setDisplayConfidence(current);

      if (progress < 1) {
        requestAnimationFrame(animateValue);
      }
    };

    requestAnimationFrame(animateValue);
  }, [confidence, animate]);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        width={diameter}
        height={diameter}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={designTokens.colors.neutral[200]}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />

        {/* Center text */}
        <text
          x={diameter / 2}
          y={diameter / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="transform rotate-90"
          style={{
            fontSize,
            fontWeight: 700,
            fill: color,
          }}
        >
          {displayConfidence}%
        </text>
      </svg>

      {/* Signal label */}
      <div className="mt-2 text-center">
        <span
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color }}
        >
          {signal.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
