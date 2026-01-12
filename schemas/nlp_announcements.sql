create table if not exists nlp_announcements (
    id bigserial primary key,
    dt date not null,
    code text,
    headline text,
    pdf_link text,
    sentiment text,
    event_type text,
    confidence numeric,
    stance text,
    relevance_score numeric,
    source text,
    parsed_text text,
    created_at timestamptz not null default now()
);

alter table nlp_announcements
    add column if not exists stance text,
    add column if not exists relevance_score numeric,
    add column if not exists source text;

create index if not exists nlp_announcements_dt_idx
    on nlp_announcements (dt);
