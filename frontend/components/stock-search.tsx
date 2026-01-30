'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { SearchResult } from '@/lib/types';
import { notify } from '@/lib/stores/notification-store';
import { Search, TrendingUp, Plus } from 'lucide-react';

interface StockSearchProps {
  placeholder?: string;
  autoFocus?: boolean;
  onSelect?: (ticker: string) => void;
}

export default function StockSearch({
  placeholder = 'Search ASX stocks...',
  autoFocus = false,
  onSelect,
}: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await api.search(query);
        setResults(response.data.results || []); // Backend returns 'results' not 'data'
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectStock(results[selectedIndex].symbol);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelectStock = (ticker: string) => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);

    if (onSelect) {
      onSelect(ticker);
    } else {
      router.push(`/stock/${ticker}`);
    }
  };

  const handleAddToWatchlist = async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger navigation
    setAddingSymbol(symbol);
    try {
      await api.addToWatchlist(symbol);
      notify.success('Added to Watchlist', `${symbol} has been added to your watchlist`);
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      notify.error('Failed to Add', `Could not add ${symbol} to watchlist. Please try again.`);
    } finally {
      setAddingSymbol(null);
    }
  };

  const formatMarketCap = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300
                   dark:border-gray-700 bg-white dark:bg-gray-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   text-base placeholder:text-gray-400"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800
                   rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
                   max-h-96 overflow-y-auto"
        >
          {results.map((result, index) => (
            <div
              key={result.symbol}
              className={`w-full px-4 py-3 flex items-center justify-between gap-4
                       ${index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''}
                       ${index === 0 ? 'rounded-t-lg' : ''}
                       ${index === results.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              <button
                onClick={() => handleSelectStock(result.symbol)}
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {result.symbol}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {result.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{result.sector}</span>
                  {result.market_cap && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatMarketCap(result.market_cap)}
                      </span>
                    </>
                  )}
                </div>
              </button>
              <button
                onClick={(e) => handleAddToWatchlist(result.symbol, e)}
                disabled={addingSymbol === result.symbol}
                className="ml-2 p-2 rounded-lg hover:bg-blue-500 hover:text-white
                         transition-colors disabled:opacity-50 flex-shrink-0"
                title="Add to watchlist"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800
                   rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
                   px-4 py-8 text-center"
        >
          <p className="text-gray-500 dark:text-gray-400">
            No stocks found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Try searching for ticker (e.g., CBA.AX) or company name
          </p>
        </div>
      )}
    </div>
  );
}
