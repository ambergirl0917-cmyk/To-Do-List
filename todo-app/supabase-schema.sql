-- Run this in your Supabase SQL Editor

-- Tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  section_id text not null,
  task text default '',
  notes text default '',
  due_date date,
  progress text default '0%' check (progress in ('0%','20%','50%','70%','100%')),
  position integer default 0,
  subject_tag text,
  reminder_days integer,
  is_recurring boolean default false,
  recur_interval text,
  is_archived boolean default false,
  checklist jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Weekly slots table
create table if not exists public.weekly_slots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day text not null,
  time_slot text default '',
  task text default '',
  notes text default '',
  date date,
  progress text default '0%',
  position integer default 0,
  created_at timestamptz default now()
);

-- Deadlines table
create table if not exists public.deadlines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text default '',
  task text default '',
  due_date date,
  priority text default 'Medium' check (priority in ('High','Medium','Low')),
  status text default 'Not Started' check (status in ('Not Started','In Progress','Done')),
  position integer default 0,
  created_at timestamptz default now()
);

-- Enable Row Level Security (keeps data private per user)
alter table public.tasks enable row level security;
alter table public.weekly_slots enable row level security;
alter table public.deadlines enable row level security;

-- RLS Policies (each user can only see their own data)
create policy "Users can manage their own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own weekly slots"
  on public.weekly_slots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own deadlines"
  on public.deadlines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
