create table if not exists sentiment (
    id bigserial primary key,
    symbol text,
    dt date not null,
    finbert_mean numeric,
    news_polarity numeric,
    sentiment_score numeric,
    source text,
    updated_at timestamptz not null default now()
);

create index if not exists sentiment_dt_symbol_idx
    on sentiment (dt, symbol);
