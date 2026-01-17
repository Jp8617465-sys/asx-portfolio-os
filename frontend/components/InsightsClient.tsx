'use client';

import useSWR from 'swr';
import Topbar from './Topbar';
import DriftChart from './DriftChart';
import FeatureImpactChart from './FeatureImpactChart';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChartContainer } from './ui/chart';
import { Skeleton } from './ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  getAsxAnnouncements,
  getDriftSummary,
  getModelExplainability,
  type AsxAnnouncementsSummary,
  type DriftSummary,
  type ModelExplainability,
} from '../lib/api';

export default function InsightsClient() {
  const { data: drift, isLoading: driftLoading } = useSWR<DriftSummary>('drift-summary', () =>
    getDriftSummary('model_a_ml')
  );
  const { data: importance, isLoading: importanceLoading } = useSWR<ModelExplainability>(
    'feature-importance',
    () => getModelExplainability('v1_2', 8)
  );
  const { data: announcements, isLoading: announcementsLoading } = useSWR<AsxAnnouncementsSummary>(
    'asx-announcements',
    () => getAsxAnnouncements(8, 30)
  );

  const driftSeries = (drift?.rows || [])
    .slice(0, 8)
    .map((row: any, index: number) => ({
      label: row.created_at?.slice(5, 10) || `Run ${index + 1}`,
      psi: row.metrics?.psi_mean ?? 0,
    }))
    .reverse();

  const latest = drift?.rows?.[0];
  const featurePulse = (importance?.features || []).map((row: any) => ({
    name: row.feature,
    value: row.importance,
  }));
  const sentimentCounts = announcements?.summary?.sentiment_counts ?? {};
  const eventCounts = announcements?.summary?.event_counts ?? {};
  const announcementRows = announcements?.items || [];

  return (
    <div className="flex flex-col gap-10">
      <Topbar
        title="Insights & Explainability"
        subtitle="Monitor drift posture and feature influence trends."
        eyebrow="Insights"
        actions={<Badge variant="secondary">Drift Live</Badge>}
      />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Drift Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {driftLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : driftSeries.length ? (
              <DriftChart data={driftSeries} />
            ) : (
              <p className="text-sm text-slate-500">No drift history available yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest Drift Read</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            {driftLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span>Baseline</span>
                  <span className="font-semibold text-ink dark:text-mist">
                    {latest?.baseline_label ?? 'n/a'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current</span>
                  <span className="font-semibold text-ink dark:text-mist">
                    {latest?.current_label ?? 'n/a'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>PSI Mean</span>
                  <span className="font-semibold text-ink dark:text-mist">
                    {latest?.metrics?.psi_mean?.toFixed?.(3) ?? 'n/a'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>PSI Max</span>
                  <span className="font-semibold text-ink dark:text-mist">
                    {latest?.metrics?.psi_max?.toFixed?.(3) ?? 'n/a'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <ChartContainer
          title="Feature Pulse"
          description="Relative feature influence snapshot from latest training summary."
        >
          {importanceLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : featurePulse.length ? (
            <FeatureImpactChart data={featurePulse} />
          ) : (
            <p className="text-sm text-slate-500">No feature importance available.</p>
          )}
        </ChartContainer>
        <Card>
          <CardHeader>
            <CardTitle>Explainability Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p>
              Momentum and trend factors continue to dominate the signal stack. Liquidity factors
              become more influential during volatility spikes.
            </p>
            <p>
              SHAP exports can be streamed here once the training pipeline publishes them alongside
              the registry.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Model C • ASX Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcementsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : announcementRows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Headline</TableHead>
                    <TableHead>Sentiment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcementRows.map((row, idx) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>{row.dt?.slice(5, 10) ?? 'n/a'}</TableCell>
                      <TableCell className="font-semibold">{row.code ?? 'n/a'}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-slate-600 dark:text-slate-400">
                        {row.headline ?? 'n/a'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.sentiment ?? 'n/a'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-500">No announcements ingested yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Pulse (30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            {announcementsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sentiment</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(sentimentCounts).length ? (
                      Object.entries(sentimentCounts).map(([label, count]) => (
                        <Badge key={label} variant="secondary">
                          {label}: {count}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No sentiment summary yet.</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Event Types</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(eventCounts).length ? (
                      Object.entries(eventCounts).map(([label, count]) => (
                        <Badge key={label} variant="secondary">
                          {label}: {count}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No event summary yet.</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
