'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Topbar from './Topbar';
import DriftChart from './DriftChart';
import FeatureImpactChart from './FeatureImpactChart';
import EnsembleSignalsTable from './EnsembleSignalsTable';
import ModelBDashboard from './ModelBDashboard';
import SentimentDashboard from './SentimentDashboard';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Skeleton } from './ui/skeleton';
import {
  getDriftSummary,
  getFeatureImportance,
  getModelCompare,
  getModelStatusSummary,
  getPortfolioAttribution,
  getPortfolioPerformance,
  getSignalsLive,
  getEnsembleSignalsLatest,
  type DriftSummary,
  type EnsembleSignals,
  type FeatureImportance,
  type ModelCompare,
  type ModelStatusSummary,
  type PortfolioAttribution,
  type PortfolioPerformance,
  type SignalsLive,
} from '../lib/api';

export default function ModelsClient() {
  const [activeTab, setActiveTab] = useState<'model_a' | 'model_b' | 'model_c' | 'ensemble'>(
    'model_a'
  );

  const { data: summary, isLoading: summaryLoading } = useSWR<ModelStatusSummary>(
    'model-status-summary',
    () => getModelStatusSummary('model_a_ml')
  );
  const { data: drift } = useSWR<DriftSummary>('drift-summary', () =>
    getDriftSummary('model_a_ml')
  );
  const { data: importance, isLoading: importanceLoading } = useSWR<FeatureImportance>(
    'feature-importance',
    () => getFeatureImportance('model_a_ml', 8)
  );
  const { data: compare, isLoading: compareLoading } = useSWR<ModelCompare>('model-compare', () =>
    getModelCompare('model_a_ml')
  );
  const { data: liveSignals, isLoading: signalsLoading } = useSWR<SignalsLive>('signals-live', () =>
    getSignalsLive('model_a_ml', 20)
  );
  const { data: attribution, isLoading: attributionLoading } = useSWR<PortfolioAttribution>(
    'portfolio-attribution',
    () => getPortfolioAttribution('model_a_v1_1', undefined, 10)
  );
  const { data: performance, isLoading: performanceLoading } = useSWR<PortfolioPerformance>(
    'portfolio-performance',
    () => getPortfolioPerformance('model_a_v1_1', 20)
  );
  const { data: ensembleSignals, isLoading: ensembleLoading } = useSWR<EnsembleSignals>(
    'ensemble-signals',
    () => getEnsembleSignalsLatest(20)
  );

  const featureImportance = (importance?.features || []).map((row: any) => ({
    name: row.feature,
    value: row.importance,
  }));

  const driftSeries = (drift?.rows || [])
    .slice(0, 6)
    .map((row: any, index: number) => ({
      label: row.created_at?.slice(5, 10) || `Run ${index + 1}`,
      psi: row.metrics?.psi_mean ?? 0,
    }))
    .reverse();

  const compareDelta = compare?.delta || {};
  const liveRows = (liveSignals?.signals || []).slice(0, 12);
  const attributionRows = (attribution?.items || []).slice(0, 8);
  const perfSeries = performance?.series || [];

  return (
    <div className="flex flex-col gap-10">
      <Topbar
        title="Model Registry"
        subtitle="Track active model versions, performance metrics, and drift posture."
        eyebrow="Model Control"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Phase 2 Live</Badge>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('model_a')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'model_a'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Model A (ML Signals)
        </button>
        <button
          onClick={() => setActiveTab('model_b')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'model_b'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Model B (Fundamentals)
        </button>
        <button
          onClick={() => setActiveTab('model_c')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'model_c'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Model C (Sentiment)
        </button>
        <button
          onClick={() => setActiveTab('ensemble')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ensemble'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Ensemble (A + B)
        </button>
      </div>

      {/* Model A Tab Content */}
      {activeTab === 'model_a' && (
        <>
          <section className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Model Versions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>ROC-AUC</TableHead>
                      <TableHead>RMSE</TableHead>
                      <TableHead>Drift</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryLoading ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="grid gap-3 md:grid-cols-5">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell className="font-semibold">
                          {summary?.last_run?.version ?? 'n/a'}
                        </TableCell>
                        <TableCell>
                          {summary?.last_run?.roc_auc_mean?.toFixed?.(3) ?? 'n/a'}
                        </TableCell>
                        <TableCell>{summary?.last_run?.rmse_mean?.toFixed?.(3) ?? 'n/a'}</TableCell>
                        <TableCell>{summary?.drift?.psi_mean?.toFixed?.(3) ?? 'n/a'}</TableCell>
                        <TableCell>
                          <Badge>Active</Badge>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Model Compare</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  {compareLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Left</span>
                        <span className="font-semibold text-ink dark:text-mist">
                          {compare?.left?.version ?? 'n/a'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Right</span>
                        <span className="font-semibold text-ink dark:text-mist">
                          {compare?.right?.version ?? 'n/a'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Δ ROC-AUC</span>
                        <span className="font-semibold text-ink dark:text-mist">
                          {compareDelta.roc_auc_mean?.toFixed?.(3) ?? 'n/a'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Δ RMSE</span>
                        <span className="font-semibold text-ink dark:text-mist">
                          {compareDelta.rmse_mean?.toFixed?.(3) ?? 'n/a'}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Feature Importance</CardTitle>
                </CardHeader>
                <CardContent>
                  {importanceLoading ? (
                    <Skeleton className="h-56 w-full" />
                  ) : featureImportance.length ? (
                    <FeatureImpactChart data={featureImportance} />
                  ) : (
                    <p className="text-sm text-slate-500">No feature importance available.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Drift Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  {driftSeries.length ? (
                    <DriftChart data={driftSeries} />
                  ) : (
                    <p className="text-sm text-slate-500">No drift data yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Top Signals (Latest)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>ML Prob</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signalsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="grid gap-3 md:grid-cols-4">
                          <Skeleton className="h-4 w-10" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : liveRows.length ? (
                    liveRows.map((row: any) => (
                      <TableRow key={row.symbol}>
                        <TableCell>{row.rank}</TableCell>
                        <TableCell className="font-semibold">{row.symbol}</TableCell>
                        <TableCell>{row.score?.toFixed?.(4) ?? 'n/a'}</TableCell>
                        <TableCell>{row.ml_prob?.toFixed?.(4) ?? 'n/a'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-slate-500">
                        No signals loaded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Attribution (Latest)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Return</TableHead>
                      <TableHead>Contribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attributionLoading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : attributionRows.length ? (
                      attributionRows.map((row: any) => (
                        <TableRow key={row.symbol}>
                          <TableCell className="font-semibold">{row.symbol ?? 'n/a'}</TableCell>
                          <TableCell>
                            {row.weight !== null && row.weight !== undefined
                              ? row.weight.toFixed(4)
                              : 'n/a'}
                          </TableCell>
                          <TableCell>
                            {row.return_1d !== null && row.return_1d !== undefined
                              ? row.return_1d.toFixed(4)
                              : 'n/a'}
                          </TableCell>
                          <TableCell>
                            {row.contribution !== null && row.contribution !== undefined
                              ? row.contribution.toFixed(4)
                              : 'n/a'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-slate-500">
                          No attribution data yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                {performanceLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Latest Return</span>
                      <span className="font-semibold text-ink dark:text-mist">
                        {attribution?.summary?.portfolio_return !== null &&
                        attribution?.summary?.portfolio_return !== undefined
                          ? attribution.summary.portfolio_return.toFixed(4)
                          : 'n/a'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Volatility</span>
                      <span className="font-semibold text-ink dark:text-mist">
                        {attribution?.summary?.volatility !== null &&
                        attribution?.summary?.volatility !== undefined
                          ? attribution.summary.volatility.toFixed(4)
                          : 'n/a'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sharpe</span>
                      <span className="font-semibold text-ink dark:text-mist">
                        {attribution?.summary?.sharpe !== null &&
                        attribution?.summary?.sharpe !== undefined
                          ? attribution.summary.sharpe.toFixed(3)
                          : 'n/a'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Observations</span>
                      <span className="font-semibold text-ink dark:text-mist">
                        {perfSeries.length}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {/* V2: Ensemble Signals (Model A + Model B) */}
          <section>
            <EnsembleSignalsTable data={ensembleSignals} isLoading={ensembleLoading} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Retrain Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
              <p>Retraining will be enabled once Phase 2 live integration is complete.</p>
              <Button variant="outline" disabled>
                Retrain Model
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Model B Tab Content */}
      {activeTab === 'model_b' && <ModelBDashboard />}

      {/* Model C Tab Content */}
      {activeTab === 'model_c' && <SentimentDashboard />}

      {/* Ensemble Tab Content */}
      {activeTab === 'ensemble' && (
        <section>
          <EnsembleSignalsTable data={ensembleSignals} isLoading={ensembleLoading} />
        </section>
      )}
    </div>
  );
}
