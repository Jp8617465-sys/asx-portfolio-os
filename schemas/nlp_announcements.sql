create table if not exists nlp_announcements (
    id bigserial primary key,
    dt date not null,
    code text,
    headline text,
    pdf_link text,
    sentiment text,
    event_type text,
    confidence numeric,
    parsed_text text,
    created_at timestamptz not null default now()
);

create index if not exists nlp_announcements_dt_idx
    on nlp_announcements (dt);
