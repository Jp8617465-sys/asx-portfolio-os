'use client';

import React from 'react';
import { designTokens } from '@/lib/design-tokens';
import { SignalType } from '@/contracts';

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
  const { diameter, strokeWidth, fontSize } = getSizeConfig(size);
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;
  const color = getSignalColor(signal);

  return (
    <div data-testid="confidence-gauge" className="flex flex-col items-center justify-center">
      <svg width={diameter} height={diameter} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={designTokens.colors.neutral[200]}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle – CSS transition replaces the rAF loop */}
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
          style={{
            transition: animate ? 'stroke-dashoffset 0.8s cubic-bezier(0.33, 1, 0.68, 1)' : 'none',
          }}
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
          {confidence}%
        </text>
      </svg>

      {/* Signal label */}
      <div className="mt-2 text-center">
        <span className="text-sm font-semibold uppercase tracking-wide" style={{ color }}>
          {signal.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
