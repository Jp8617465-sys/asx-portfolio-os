-- User Alerts & Notifications Schema
-- Tracks user alert preferences and manages notification delivery

-- =============================================================================
-- User Alert Preferences: Store user notification settings
-- =============================================================================
create table if not exists user_alert_preferences (
    id bigserial primary key,
    user_id text not null unique, -- User identifier

    -- Notification channels
    email_enabled boolean not null default true,
    push_enabled boolean not null default true,
    sms_enabled boolean not null default false, -- Premium feature

    -- Alert types
    signal_changes_enabled boolean not null default true,
    high_confidence_enabled boolean not null default true,
    price_movements_enabled boolean not null default false,
    watchlist_updates_enabled boolean not null default true,
    portfolio_rebalancing_enabled boolean not null default true,

    -- Thresholds
    confidence_threshold integer not null default 80 check (confidence_threshold >= 50 and confidence_threshold <= 100),
    price_movement_threshold integer not null default 5 check (price_movement_threshold >= 1 and price_movement_threshold <= 20),

    -- Daily digest settings
    daily_digest_enabled boolean not null default false,
    daily_digest_time time not null default '08:00:00',
    digest_include_top_signals boolean not null default true,
    digest_include_portfolio_summary boolean not null default true,

    -- Metadata
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_alert_prefs_user_id on user_alert_preferences(user_id);

-- =============================================================================
-- User Notifications: Individual notification records
-- =============================================================================
create table if not exists user_notifications (
    id bigserial primary key,
    user_id text not null,

    -- Notification content
    type text not null check (type in ('info', 'success', 'warning', 'error')),
    title text not null,
    message text not null,
    action_url text, -- Optional link to relevant page

    -- Related entities
    ticker text, -- If related to a specific stock
    portfolio_id bigint, -- If related to portfolio

    -- Status
    is_read boolean not null default false,
    read_at timestamptz,

    -- Delivery tracking
    email_sent boolean not null default false,
    email_sent_at timestamptz,
    push_sent boolean not null default false,
    push_sent_at timestamptz,

    -- Metadata
    created_at timestamptz not null default now(),
    expires_at timestamptz default (now() + interval '7 days') -- Auto-expire after 7 days
);

create index if not exists idx_notifications_user_id on user_notifications(user_id);
create index if not exists idx_notifications_created_at on user_notifications(created_at desc);
create index if not exists idx_notifications_is_read on user_notifications(is_read) where is_read = false;
create index if not exists idx_notifications_ticker on user_notifications(ticker) where ticker is not null;

-- =============================================================================
-- Signal Change History: Track signal changes for alert generation
-- =============================================================================
create table if not exists signal_change_history (
    id bigserial primary key,
    ticker text not null,

    -- Old signal
    old_signal text,
    old_confidence numeric,
    old_as_of date,

    -- New signal
    new_signal text not null,
    new_confidence numeric not null,
    new_as_of date not null,

    -- Change metadata
    change_type text not null check (change_type in ('new', 'upgrade', 'downgrade', 'confidence_increase', 'confidence_decrease', 'no_change')),
    magnitude integer, -- For confidence changes: abs(new - old)

    -- Notification tracking
    notifications_generated boolean not null default false,
    notifications_generated_at timestamptz,

    -- Metadata
    detected_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_signal_history_ticker on signal_change_history(ticker);
create index if not exists idx_signal_history_detected_at on signal_change_history(detected_at desc);
create index if not exists idx_signal_history_notif_pending on signal_change_history(notifications_generated) where notifications_generated = false;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to create notification for user
create or replace function create_notification(
    p_user_id text,
    p_type text,
    p_title text,
    p_message text,
    p_action_url text default null,
    p_ticker text default null,
    p_portfolio_id bigint default null
)
returns bigint as $$
declare
    v_notification_id bigint;
    v_prefs record;
begin
    -- Get user preferences
    select * into v_prefs
    from user_alert_preferences
    where user_id = p_user_id;

    -- Create notification
    insert into user_notifications (
        user_id, type, title, message, action_url, ticker, portfolio_id
    )
    values (
        p_user_id, p_type, p_title, p_message, p_action_url, p_ticker, p_portfolio_id
    )
    returning id into v_notification_id;

    return v_notification_id;
end;
$$ language plpgsql;

-- Function to detect signal changes and create history records
create or replace function detect_signal_changes()
returns int as $$
declare
    v_count int := 0;
    v_signal record;
    v_prev record;
begin
    -- Find all signals that have changed since last check
    for v_signal in
        select s.ticker, s.signal, s.confidence, s.as_of
        from signals s
        where s.as_of = current_date
    loop
        -- Get previous signal for this ticker
        select signal, confidence, as_of
        into v_prev
        from signals
        where ticker = v_signal.ticker
          and as_of < v_signal.as_of
        order by as_of desc
        limit 1;

        -- Determine change type
        if v_prev.signal is null then
            -- New signal
            insert into signal_change_history (
                ticker, old_signal, old_confidence, old_as_of,
                new_signal, new_confidence, new_as_of, change_type
            )
            values (
                v_signal.ticker, null, null, null,
                v_signal.signal, v_signal.confidence, v_signal.as_of, 'new'
            );
            v_count := v_count + 1;

        elsif v_prev.signal != v_signal.signal then
            -- Signal changed
            declare
                v_change_type text;
            begin
                -- Determine if upgrade or downgrade
                if (v_signal.signal in ('STRONG_BUY', 'BUY') and v_prev.signal in ('HOLD', 'SELL', 'STRONG_SELL')) or
                   (v_signal.signal = 'HOLD' and v_prev.signal in ('SELL', 'STRONG_SELL')) then
                    v_change_type := 'upgrade';
                else
                    v_change_type := 'downgrade';
                end if;

                insert into signal_change_history (
                    ticker, old_signal, old_confidence, old_as_of,
                    new_signal, new_confidence, new_as_of, change_type
                )
                values (
                    v_signal.ticker, v_prev.signal, v_prev.confidence, v_prev.as_of,
                    v_signal.signal, v_signal.confidence, v_signal.as_of, v_change_type
                );
                v_count := v_count + 1;
            end;

        elsif abs(v_signal.confidence - v_prev.confidence) >= 10 then
            -- Significant confidence change (>= 10%)
            insert into signal_change_history (
                ticker, old_signal, old_confidence, old_as_of,
                new_signal, new_confidence, new_as_of, change_type, magnitude
            )
            values (
                v_signal.ticker, v_prev.signal, v_prev.confidence, v_prev.as_of,
                v_signal.signal, v_signal.confidence, v_signal.as_of,
                case when v_signal.confidence > v_prev.confidence then 'confidence_increase' else 'confidence_decrease' end,
                abs(v_signal.confidence - v_prev.confidence)
            );
            v_count := v_count + 1;
        end if;
    end loop;

    return v_count;
end;
$$ language plpgsql;

-- Function to generate notifications from signal changes
create or replace function generate_signal_notifications()
returns int as $$
declare
    v_count int := 0;
    v_change record;
    v_user record;
begin
    -- Get all unprocessed signal changes
    for v_change in
        select *
        from signal_change_history
        where notifications_generated = false
        order by detected_at desc
    loop
        -- Get all users who should be notified
        for v_user in
            select user_id
            from user_alert_preferences
            where signal_changes_enabled = true
              and (
                  -- User has this ticker in watchlist
                  exists (
                      select 1 from watchlist
                      where ticker = v_change.ticker
                  )
                  or
                  -- User has this ticker in portfolio
                  exists (
                      select 1 from user_holdings h
                      join user_portfolios p on p.id = h.portfolio_id
                      where h.ticker = v_change.ticker
                        and p.user_id = user_alert_preferences.user_id
                        and p.is_active = true
                  )
              )
        loop
            -- Create notification
            declare
                v_title text;
                v_message text;
                v_type text;
                v_action_url text;
            begin
                -- Build notification content based on change type
                if v_change.change_type = 'upgrade' then
                    v_title := v_change.ticker || ' signal upgraded';
                    v_message := 'Signal changed from ' || v_change.old_signal || ' to ' || v_change.new_signal ||
                                ' (confidence: ' || round(v_change.new_confidence, 1) || '%)';
                    v_type := 'success';
                elsif v_change.change_type = 'downgrade' then
                    v_title := v_change.ticker || ' signal downgraded';
                    v_message := 'Signal changed from ' || v_change.old_signal || ' to ' || v_change.new_signal ||
                                ' (confidence: ' || round(v_change.new_confidence, 1) || '%)';
                    v_type := 'warning';
                elsif v_change.change_type = 'confidence_increase' then
                    v_title := v_change.ticker || ' confidence increased';
                    v_message := 'Confidence increased by ' || v_change.magnitude || '% to ' ||
                                round(v_change.new_confidence, 1) || '%';
                    v_type := 'info';
                else
                    v_title := v_change.ticker || ' signal updated';
                    v_message := 'New signal: ' || v_change.new_signal ||
                                ' (confidence: ' || round(v_change.new_confidence, 1) || '%)';
                    v_type := 'info';
                end if;

                v_action_url := '/stock/' || v_change.ticker;

                -- Create notification
                perform create_notification(
                    v_user.user_id,
                    v_type,
                    v_title,
                    v_message,
                    v_action_url,
                    v_change.ticker,
                    null
                );

                v_count := v_count + 1;
            end;
        end loop;

        -- Mark as processed
        update signal_change_history
        set notifications_generated = true,
            notifications_generated_at = now()
        where id = v_change.id;
    end loop;

    return v_count;
end;
$$ language plpgsql;

-- =============================================================================
-- Cleanup Function: Delete expired notifications
-- =============================================================================
create or replace function cleanup_expired_notifications()
returns int as $$
declare
    v_deleted int;
begin
    delete from user_notifications
    where expires_at < now();

    get diagnostics v_deleted = row_count;
    return v_deleted;
end;
$$ language plpgsql;

-- =============================================================================
-- Default preferences for new users
-- =============================================================================
create or replace function ensure_user_preferences(p_user_id text)
returns void as $$
begin
    insert into user_alert_preferences (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;
end;
$$ language plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================
comment on table user_alert_preferences is 'User notification preferences and alert settings';
comment on table user_notifications is 'Individual notification records for users';
comment on table signal_change_history is 'Tracks AI signal changes for alert generation';
comment on function create_notification is 'Helper to create notifications for users';
comment on function detect_signal_changes is 'Detects new signal changes and records them';
comment on function generate_signal_notifications is 'Generates notifications from signal changes';
comment on function cleanup_expired_notifications is 'Deletes notifications older than 7 days';
