-- Acompaña · esquema para Supabase (fase 2, cuando la demo se apruebe)
-- Refleja 1:1 los tipos de src/lib/types.ts. Una "agencia" = una dueña con su equipo.

create table agencias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_duena text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table cuidadoras (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  nombre text not null,
  fecha_nacimiento date,
  experiencia int not null default 0,
  telefono text,
  descripcion text,
  rasgos text[] not null default '{}',
  valoracion smallint not null default 3 check (valoracion between 1 and 5),
  tarifa_hora int not null default 0,          -- CLP
  color text not null default 'rosa',
  activa boolean not null default true,
  notas text,                                  -- privadas de la dueña
  created_at timestamptz not null default now()
);

create table turnos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  nombre text not null,
  emoji text,
  inicio time not null,
  fin time not null,                           -- si fin <= inicio cruza la medianoche
  color text not null default 'cielo',
  orden smallint not null default 0
);

create type estado_turno as enum ('programado', 'asistio', 'atraso', 'falto');

create table asignaciones (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  fecha date not null,
  turno_id uuid not null references turnos(id),
  cuidadora_id uuid not null references cuidadoras(id),
  inicio time not null,
  fin time not null,
  estado estado_turno not null default 'programado',
  nota text,
  created_at timestamptz not null default now()
);
create index on asignaciones (agencia_id, fecha);

create table pagos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  cuidadora_id uuid not null references cuidadoras(id),
  semana date not null,                        -- lunes de la semana pagada
  ajuste int not null default 0,               -- bono (+) / descuento (-)
  monto int not null default 0,
  pagado_el date,
  unique (cuidadora_id, semana)
);

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  concepto text not null,
  monto int not null check (monto >= 0),
  cliente text,
  medio text not null default 'transferencia' check (medio in ('efectivo', 'transferencia'))
);
create index on movimientos (agencia_id, fecha);

-- RLS: cada dueña solo ve los datos de su agencia
alter table agencias enable row level security;
alter table cuidadoras enable row level security;
alter table turnos enable row level security;
alter table asignaciones enable row level security;
alter table pagos enable row level security;
alter table movimientos enable row level security;

create policy "duena ve su agencia" on agencias for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "por agencia" on cuidadoras for all
  using (agencia_id in (select id from agencias where owner_id = auth.uid()))
  with check (agencia_id in (select id from agencias where owner_id = auth.uid()));
create policy "por agencia" on turnos for all
  using (agencia_id in (select id from agencias where owner_id = auth.uid()))
  with check (agencia_id in (select id from agencias where owner_id = auth.uid()));
create policy "por agencia" on asignaciones for all
  using (agencia_id in (select id from agencias where owner_id = auth.uid()))
  with check (agencia_id in (select id from agencias where owner_id = auth.uid()));
create policy "por agencia" on pagos for all
  using (agencia_id in (select id from agencias where owner_id = auth.uid()))
  with check (agencia_id in (select id from agencias where owner_id = auth.uid()));
create policy "por agencia" on movimientos for all
  using (agencia_id in (select id from agencias where owner_id = auth.uid()))
  with check (agencia_id in (select id from agencias where owner_id = auth.uid()));
