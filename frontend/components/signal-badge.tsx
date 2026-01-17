'use client';

import React from 'react';
import { SignalType } from '@/lib/types';
import { designTokens } from '@/lib/design-tokens';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';

interface SignalBadgeProps {
  signal: SignalType;
  confidence?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getSignalConfig = (signal: SignalType) => {
  const { signals } = designTokens.colors;

  switch (signal) {
    case 'STRONG_BUY':
      return {
        color: signals.strongBuy,
        bgColor: `${signals.strongBuy}20`,
        icon: ArrowUp,
        label: 'Strong Buy',
      };
    case 'BUY':
      return {
        color: signals.buy,
        bgColor: `${signals.buy}20`,
        icon: TrendingUp,
        label: 'Buy',
      };
    case 'HOLD':
      return {
        color: signals.hold,
        bgColor: `${signals.hold}20`,
        icon: Minus,
        label: 'Hold',
      };
    case 'SELL':
      return {
        color: signals.sell,
        bgColor: `${signals.sell}20`,
        icon: TrendingDown,
        label: 'Sell',
      };
    case 'STRONG_SELL':
      return {
        color: signals.strongSell,
        bgColor: `${signals.strongSell}20`,
        icon: ArrowDown,
        label: 'Strong Sell',
      };
  }
};

const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'md':
      return 'px-3 py-1.5 text-sm';
    case 'lg':
      return 'px-4 py-2 text-base';
  }
};

export default function SignalBadge({
  signal,
  confidence,
  showIcon = true,
  size = 'md',
}: SignalBadgeProps) {
  const config = getSignalConfig(signal);
  const Icon = config.icon;
  const sizeClasses = getSizeClasses(size);
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold
                 uppercase tracking-wide ${sizeClasses}`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
      }}
    >
      {showIcon && <Icon size={iconSize} />}
      <span>{config.label}</span>
      {confidence !== undefined && <span className="opacity-75">({confidence}%)</span>}
    </div>
  );
}
