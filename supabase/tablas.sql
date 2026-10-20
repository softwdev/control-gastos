-- =========================================================
-- Control de gastos: tablas y vistas en Supabase (proyecto pwa-estudiante)
-- Ya aplicadas en la base de datos. Se guardan aquí como referencia.
-- Prefijo cg_ para no mezclarse con las tablas de Tareas académicas (ta_).
-- =========================================================

-- Función compartida por ambas apps: actualiza la columna actualizado_en
create or replace function public.fijar_actualizado_en()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- Categorías de ingresos y gastos (una categoría tiene muchos movimientos)
create table public.cg_categorias (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (char_length(btrim(nombre)) between 2 and 30),
  nombre_clave    text generated always as (lower(btrim(nombre))) stored,
  icono           text not null check (char_length(icono) between 1 and 8),
  tipo            text not null check (tipo in ('ingreso', 'gasto')),
  predeterminada  boolean not null default false,
  creado_en       timestamptz not null default now(),
  constraint cg_categorias_nombre_unico unique (tipo, nombre_clave),
  constraint cg_categorias_id_tipo unique (id, tipo)
);

-- Movimientos: cada uno pertenece a una categoría del mismo tipo (ingreso o gasto)
create table public.cg_movimientos (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('ingreso', 'gasto')),
  monto           numeric(10, 2) not null check (monto > 0 and monto <= 999999.99),
  categoria_id    uuid not null,
  descripcion     text not null default '' check (char_length(descripcion) <= 80),
  fecha           date not null check (fecha >= date '2000-01-01'),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint cg_movimientos_categoria_fk
    foreign key (categoria_id, tipo) references public.cg_categorias (id, tipo) on delete restrict
);
create index cg_movimientos_fecha_idx on public.cg_movimientos (fecha);
create index cg_movimientos_categoria_idx on public.cg_movimientos (categoria_id, tipo);

create trigger cg_movimientos_actualizado
  before update on public.cg_movimientos
  for each row execute function public.fijar_actualizado_en();

-- Categorías predeterminadas (mismos ids que src/types.ts)
insert into public.cg_categorias (id, nombre, icono, tipo, predeterminada) values
  ('c0000000-0000-4000-8000-000000000001', 'Comida', '🍽️', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000002', 'Transporte', '🚌', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000003', 'Escuela y materiales', '📚', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000004', 'Renta y servicios', '🏠', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000005', 'Celular e internet', '📱', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000006', 'Salud', '🩺', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000007', 'Entretenimiento', '🎮', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000008', 'Ropa y cuidado personal', '👕', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000009', 'Otros gastos', '📦', 'gasto', true),
  ('c0000000-0000-4000-8000-000000000010', 'Trabajo', '💼', 'ingreso', true),
  ('c0000000-0000-4000-8000-000000000011', 'Beca', '🎓', 'ingreso', true),
  ('c0000000-0000-4000-8000-000000000012', 'Apoyo familiar', '🤝', 'ingreso', true),
  ('c0000000-0000-4000-8000-000000000013', 'Otros ingresos', '💰', 'ingreso', true);

-- Las categorías predeterminadas no se pueden borrar
create or replace function public.cg_proteger_predeterminadas()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.predeterminada then
    raise exception 'La categoría predeterminada "%" no se puede eliminar', old.nombre using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger cg_categorias_proteger
  before delete on public.cg_categorias
  for each row execute function public.cg_proteger_predeterminadas();

-- Vistas que consulta la app para las gráficas y el saldo
create view public.cg_resumen_mensual with (security_invoker = true) as
select
  to_char(fecha, 'YYYY-MM')                                              as mes,
  coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)::numeric(12,2) as ingresos,
  coalesce(sum(monto) filter (where tipo = 'gasto'), 0)::numeric(12,2)   as gastos,
  count(*)                                                               as movimientos
from public.cg_movimientos
group by 1;

create view public.cg_totales_por_categoria with (security_invoker = true) as
select
  to_char(m.fecha, 'YYYY-MM') as mes,
  m.tipo,
  c.id                        as categoria_id,
  c.nombre,
  c.icono,
  sum(m.monto)::numeric(12,2) as total,
  count(*)                    as movimientos
from public.cg_movimientos m
join public.cg_categorias c on c.id = m.categoria_id
group by 1, 2, 3, 4, 5;

create view public.cg_saldo with (security_invoker = true) as
select
  coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)::numeric(12,2) as ingresos,
  coalesce(sum(monto) filter (where tipo = 'gasto'), 0)::numeric(12,2)   as gastos,
  (coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)
   - coalesce(sum(monto) filter (where tipo = 'gasto'), 0))::numeric(12,2) as saldo
from public.cg_movimientos;

-- Seguridad: RLS activado. La app no tiene inicio de sesión, así que el rol público (anon)
-- puede leer y escribir estas tablas.
alter table public.cg_categorias  enable row level security;
alter table public.cg_movimientos enable row level security;

create policy "cg_categorias acceso publico" on public.cg_categorias
  for all to anon, authenticated using (true) with check (true);
create policy "cg_movimientos acceso publico" on public.cg_movimientos
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.cg_categorias, public.cg_movimientos to anon, authenticated;
grant select on public.cg_resumen_mensual, public.cg_totales_por_categoria, public.cg_saldo to anon, authenticated;
