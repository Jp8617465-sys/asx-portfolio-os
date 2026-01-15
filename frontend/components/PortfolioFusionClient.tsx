import { useEffect, useState } from "react";

interface PortfolioOverview {
  status: string;
  computed_at: string;
  summary: {
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    debt_service_ratio: number;
    risk_score: number;
  };
  equities: {
    value: number;
    count: number;
    allocation_pct: number;
  };
  property: {
    value: number;
    count: number;
    allocation_pct: number;
  };
  loans: {
    balance: number;
    count: number;
    monthly_payment: number;
    allocation_pct: number;
  };
}

export default function PortfolioFusionClient() {
  const [data, setData] = useState<PortfolioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioOverview();
  }, []);

  const fetchPortfolioOverview = async () => {
    try {
      setLoading(true);
      const apiKey = process.env.NEXT_PUBLIC_OS_API_KEY || "";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8788";

      const response = await fetch(`${apiUrl}/portfolio/overview`, {
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getRiskLevel = (score: number) => {
    if (score < 30) return { label: "Low", color: "text-green-600" };
    if (score < 60) return { label: "Medium", color: "text-yellow-600" };
    return { label: "High", color: "text-red-600" };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPortfolioOverview}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.status === "no_data") {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No portfolio data available. Run the portfolio fusion job first.
          </p>
        </div>
      </div>
    );
  }

  const riskLevel = getRiskLevel(data.summary.risk_score);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Overview</h1>
        <button
          onClick={fetchPortfolioOverview}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Net Worth</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(data.summary.net_worth)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Assets: {formatCurrency(data.summary.total_assets)}
          </p>
          <p className="text-sm text-gray-600">
            Liabilities: {formatCurrency(data.summary.total_liabilities)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Risk Score</h3>
          <p className={`mt-2 text-3xl font-bold ${riskLevel.color}`}>
            {data.summary.risk_score.toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Level: <span className={riskLevel.color}>{riskLevel.label}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase">
            Debt Service Ratio
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {data.summary.debt_service_ratio.toFixed(1)}%
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Monthly commitment relative to income
          </p>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Asset Allocation</h2>
        <div className="space-y-4">
          {/* Equities */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Equities</span>
              <span className="text-gray-600">
                {formatCurrency(data.equities.value)} ({data.equities.allocation_pct.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${data.equities.allocation_pct}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{data.equities.count} holdings</p>
          </div>

          {/* Property */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Property</span>
              <span className="text-gray-600">
                {formatCurrency(data.property.value)} ({data.property.allocation_pct.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${data.property.allocation_pct}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{data.property.count} properties</p>
          </div>

          {/* Loans */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Loans (Liabilities)</span>
              <span className="text-gray-600">
                {formatCurrency(data.loans.balance)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${Math.min(data.loans.allocation_pct, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {data.loans.count} loans • {formatCurrency(data.loans.monthly_payment)}/mo
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 text-center">
        Last updated: {new Date(data.computed_at).toLocaleString()}
      </p>
    </div>
  );
}
