-- RL Experiments: Track reinforcement learning training runs
create table if not exists rl_experiments (
    id bigserial primary key,
    experiment_name text not null,
    algorithm text not null, -- 'PPO', 'A2C', 'SAC', 'TD3'
    
    -- Environment config
    env_type text not null, -- 'ASX_Portfolio', 'Single_Asset', 'Multi_Asset'
    tickers text[], -- Array of tickers in environment
    start_date date,
    end_date date,
    
    -- Training config
    total_timesteps integer,
    learning_rate numeric,
    gamma numeric,
    batch_size integer,
    n_steps integer,
    
    -- Hyperparameters (flexible JSON)
    hyperparameters jsonb,
    
    -- Results
    status text not null, -- 'running', 'completed', 'failed'
    final_reward numeric,
    mean_reward numeric,
    std_reward numeric,
    sharpe_ratio numeric,
    max_drawdown numeric,
    
    -- Model artifacts
    model_path text,
    tensorboard_path text,
    
    -- Metadata
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    duration_seconds numeric,
    
    created_at timestamptz not null default now()
);

create index if not exists idx_rl_experiments_algorithm on rl_experiments(algorithm);
create index if not exists idx_rl_experiments_status on rl_experiments(status);
create index if not exists idx_rl_experiments_started_at on rl_experiments(started_at desc);

-- RL Episode History: Track individual episode performance
create table if not exists rl_episodes (
    id bigserial primary key,
    experiment_id bigint references rl_experiments(id),
    episode_num integer not null,
    
    -- Episode metrics
    total_reward numeric,
    episode_length integer,
    final_portfolio_value numeric,
    sharpe_ratio numeric,
    max_drawdown numeric,
    
    -- Actions taken
    num_trades integer,
    actions jsonb, -- Array of actions taken
    
    created_at timestamptz not null default now()
);

create index if not exists idx_rl_episodes_experiment_id on rl_episodes(experiment_id);
create index if not exists idx_rl_episodes_episode_num on rl_episodes(episode_num);
