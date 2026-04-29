-- ═══════════════════════════════════════════
-- GIARDINO APP - Supabase Schema
-- Cole este SQL no Supabase SQL Editor e execute
-- ═══════════════════════════════════════════

-- USERS
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  nome text,
  role text default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz default now()
);

-- FICHAS TÉCNICAS
create table if not exists fichas (
  id uuid primary key default gen_random_uuid(),
  produto text not null,
  categoria text,
  rendimento text,
  unidade text,
  num_porcoes text,
  custo_porcao numeric,
  preco_loja numeric,
  preco_ifood numeric,
  cmv_loja_pct numeric,
  margem_loja numeric,
  margem_ifood numeric,
  cmv_ifood_pct numeric,
  tx_ifood numeric,
  insumos jsonb default '[]',
  modo_preparo jsonb default '[]',
  mise_en_place jsonb default '[]',
  created_by text,
  updated_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INSUMOS
create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  unid text,
  qtd_bruta numeric,
  qtd_liq numeric,
  rend numeric,
  valor_bruto numeric,
  valor_unit numeric,
  fornecedor1 text,
  fornecedor2 text,
  created_by text,
  updated_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TRANSFORMADOS
create table if not exists transformados (
  id uuid primary key default gen_random_uuid(),
  produto text not null,
  categoria text default 'TRANSFORMADOS',
  rendimento text,
  unidade text,
  custo_porcao numeric,
  custo_unit_calc numeric,
  insumos jsonb default '[]',
  modo_preparo jsonb default '[]',
  mise_en_place jsonb default '[]',
  num_porcoes text default '1',
  created_by text,
  updated_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- OBS + FOTOS (por ficha)
create table if not exists obs (
  id uuid primary key default gen_random_uuid(),
  ficha_id text not null unique,
  obs text default '',
  photo text default '',
  updated_at timestamptz default now()
);

-- Row Level Security (aberto para service key)
alter table users enable row level security;
alter table fichas enable row level security;
alter table insumos enable row level security;
alter table transformados enable row level security;
alter table obs enable row level security;

-- Policies: allow all for service_role (used by backend)
create policy "service_role_all_users" on users for all using (true);
create policy "service_role_all_fichas" on fichas for all using (true);
create policy "service_role_all_insumos" on insumos for all using (true);
create policy "service_role_all_transformados" on transformados for all using (true);
create policy "service_role_all_obs" on obs for all using (true);
