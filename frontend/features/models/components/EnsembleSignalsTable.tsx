'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { EnsembleSignals } from '@/features/signals/api';

type EnsembleSignalsTableProps = {
  data?: EnsembleSignals;
  isLoading?: boolean;
};

function getSignalColor(signal?: string) {
  switch (signal) {
    case 'STRONG_BUY':
      return 'bg-green-600 hover:bg-green-700';
    case 'BUY':
      return 'bg-green-500 hover:bg-green-600';
    case 'HOLD':
      return 'bg-slate-500 hover:bg-slate-600';
    case 'SELL':
      return 'bg-red-500 hover:bg-red-600';
    case 'STRONG_SELL':
      return 'bg-red-600 hover:bg-red-700';
    default:
      return 'bg-slate-400 hover:bg-slate-500';
  }
}

export default function EnsembleSignalsTable({ data, isLoading }: EnsembleSignalsTableProps) {
  const [filter, setFilter] = useState<'all' | 'agreement' | 'no-conflict'>('all');

  const signals = data?.signals || [];
  const statistics = data?.statistics;

  // Apply filters
  const filteredSignals = signals.filter((signal) => {
    if (filter === 'agreement') return signal.agreement?.signals_agree;
    if (filter === 'no-conflict') return !signal.agreement?.conflict;
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Ensemble Signals (Model A + Model B)</CardTitle>
          <p className="text-sm text-slate-500">
            Weighted: 60% Momentum + 40% Fundamentals • as_of {data?.as_of || 'n/a'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'agreement' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('agreement')}
          >
            Agreement Only
          </Button>
          <Button
            variant={filter === 'no-conflict' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('no-conflict')}
          >
            No Conflict
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        {statistics && (
          <div className="mb-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Agreement Rate:</span>
              <Badge variant="secondary">
                {(statistics.agreement_rate || 0 * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Conflict Rate:</span>
              <Badge variant="secondary">
                {((statistics.conflict_rate || 0) * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Showing:</span>
              <Badge>{filteredSignals.length} signals</Badge>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Model A</TableHead>
                <TableHead>Model B</TableHead>
                <TableHead>Ensemble</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="grid gap-3 md:grid-cols-7">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <Skeleton key={j} className="h-4 w-full" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredSignals.length ? (
                filteredSignals.slice(0, 20).map((signal) => (
                  <TableRow key={signal.symbol}>
                    <TableCell className="font-mono text-xs">{signal.rank || 'n/a'}</TableCell>
                    <TableCell className="font-semibold">{signal.symbol}</TableCell>
                    <TableCell>
                      <Badge className={getSignalColor(signal.component_signals?.model_a?.signal)}>
                        {signal.component_signals?.model_a?.signal || 'n/a'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          className={getSignalColor(signal.component_signals?.model_b?.signal)}
                        >
                          {signal.component_signals?.model_b?.signal || 'n/a'}
                        </Badge>
                        {/* Show quality score as a small badge */}
                        {signal.component_signals?.model_b && (
                          <Badge className="text-xs" variant="outline">
                            {/* This would need quality score from the API */}
                            Quality: -
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getSignalColor(signal.signal)}>{signal.signal}</Badge>
                        {signal.agreement?.conflict && (
                          <span
                            className="text-xs text-red-600 dark:text-red-400"
                            title="Models disagree"
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs">
                          {signal.ensemble_score?.toFixed(3) || 'n/a'}
                        </span>
                        {/* Confidence Breakdown: 60% A + 40% B */}
                        {signal.component_signals?.model_a && signal.component_signals?.model_b && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <span title="60% Model A">
                              A:{' '}
                              {((signal.component_signals.model_a.confidence || 0) * 0.6).toFixed(
                                2
                              )}
                            </span>
                            <span>+</span>
                            <span title="40% Model B">
                              B:{' '}
                              {((signal.component_signals.model_b.confidence || 0) * 0.4).toFixed(
                                2
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {signal.agreement?.conflict ? (
                        <Badge variant="default" className="bg-red-600 text-white text-xs">
                          ⚠️ Conflict
                        </Badge>
                      ) : signal.agreement?.signals_agree ? (
                        <Badge variant="default" className="bg-green-600 text-white text-xs">
                          ✓ Agree
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Mixed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    No ensemble signals available. Run generate_ensemble_signals.py first.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
