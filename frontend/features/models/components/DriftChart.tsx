'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DriftPoint {
  label: string;
  psi: number;
}

export default function DriftChart({ data }: { data: DriftPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="label" stroke="var(--chart-axis)" />
          <YAxis stroke="var(--chart-axis)" />
          <Tooltip />
          <Line type="monotone" dataKey="psi" stroke="#2F6FED" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
