# Control de gastos personales (PWA con React + TypeScript)

Permite registrar los ingresos y gastos diarios de un estudiante.
- Categorías de gastos e ingresos (predeterminadas y personalizadas).
- Cálculo del saldo disponible y del balance de cada mes.
- Gráficas de ingresos y gastos mensuales (6 o 12 meses) y gastos por categoría, con vista de tabla.
- Historial con filtros por mes, tipo, categoría y búsqueda, disponible sin conexión.
- Respaldo: descargar e importar los datos en JSON.
- Botón "Cargar datos de ejemplo" para probar las gráficas.

## Requisitos

- Node.js 20.19 o superior (recomendado 22 LTS).

## Comandos

```bash
npm install        # solo si falta la carpeta node_modules
cp .env.example .env   # datos de conexión a Supabase (una sola vez)
npm run dev        # modo desarrollo en http://localhost:5173
npm run build      # compila a la carpeta dist/ (incluye el service worker)
npm run preview    # sirve el build en http://localhost:4173
```

## Probar la PWA y el modo sin conexión

El service worker solo se activa con el build de producción:

1. `npm run build` y después `npm run preview`.
2. Abre http://localhost:4173 en Chrome o Edge. Aparecerá el botón **Instalar app** (o el ícono de instalar en la barra de direcciones).
3. En DevTools > Application > Service workers marca **Offline** (o desconecta el internet) y recarga: la app y tus datos siguen disponibles.

También funciona desde XAMPP: después de `npm run build` abre
`http://localhost/typescript%20y%20react/control-gastos/dist/` (el build usa rutas relativas).

## Cómo funciona sin conexión

- `public/manifest.webmanifest` + íconos en `public/icons/`: hacen la app instalable.
- `pwa-plugin.ts`: plugin de Vite que, al compilar, genera `dist/sw.js` con la lista de todos los archivos del build.
- El service worker guarda esos archivos en caché al instalarse y responde desde la caché cuando no hay red.
- Los datos se guardan en `localStorage`, así que siempre están en el dispositivo.

## Base de datos en Supabase

Los datos se guardan en el proyecto de Supabase **pwa-estudiante**. Las dos apps usan la misma base de datos, pero cada una tiene sus propias tablas: `ta_` para Tareas académicas y `cg_` para Control de gastos.

| Tabla o vista | Contenido | Relación |
|---|---|---|
| `cg_categorias` | Categorías de ingreso y gasto (13 predeterminadas + propias) | Una categoría tiene muchos movimientos |
| `cg_movimientos` | Tipo, monto, descripción y fecha | `(categoria_id, tipo)` → `cg_categorias(id, tipo)`: la categoría debe ser del mismo tipo |
| Vista `cg_resumen_mensual` | Ingresos y gastos por mes | Alimenta la gráfica mensual |
| Vista `cg_totales_por_categoria` | Total por categoría y mes | Alimenta la gráfica por categoría |
| Vista `cg_saldo` | Ingresos, gastos y saldo disponible | Alimenta el saldo del resumen |

El SQL completo está en `supabase/tablas.sql`.

### Conexión

- `.env.example` contiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Para desarrollar, cópialo como `.env` (`cp .env.example .env`). Vite mete esos valores en el build. El workflow de GitHub Actions hace la misma copia antes de compilar.
- `src/lib/supabase.ts` crea el cliente con `@supabase/supabase-js`. No hay inicio de sesión: se usa la clave pública (rol `anon`) y las políticas RLS de las tablas.
- `src/lib/database.types.ts` contiene los tipos de TypeScript generados a partir de las tablas.

### Cómo se guardan y consultan los datos (con y sin conexión)

1. La interfaz siempre lee y escribe en una copia local (`src/lib/store.ts`, en localStorage), por eso funciona sin internet.
2. Cada alta, edición o borrado se agrega a una cola de cambios pendientes (`src/lib/sync.ts`).
3. Cuando hay conexión, la cola se envía en orden a Supabase (`upsert` y `delete`) y después se descargan las tablas con `select`. Los cambios hechos en otro dispositivo aparecen al sincronizar.
4. Se sincroniza al abrir la app, al recuperar la conexión, al volver a la pestaña, cada 30 segundos y con el botón **Sincronizar**.
5. Los ids son UUID generados en el dispositivo, así un registro creado sin conexión conserva su id al subirse.

Toda la lógica de inserción, actualización, borrado y consulta está en `src/data/gastos.ts`. Las gráficas y el saldo consultan las vistas de la base de datos (`fetchMonthlySeries`, `fetchCategoryTotals`, `fetchBalance`). Sin conexión, o mientras haya cambios por subir, se calculan con la copia local, y debajo de cada gráfica se indica de dónde salieron los datos.

## Estructura

```
src/
  App.tsx                     Navegación, estado y acciones (CRUD)
  types.ts                    Tipos Transaction, Category y categorías predeterminadas
  components/
    SummaryView.tsx           Saldo disponible y resumen del mes
    HistoryView.tsx           Historial con filtros
    ChartsView.tsx            Gráficas
    MonthlyChart.tsx          Gráfica de barras SVG (ingresos vs gastos por mes)
    CategoryBreakdown.tsx     Barras de gasto por categoría
    SettingsView.tsx          Categorías personalizadas y respaldo
    TransactionDialog.tsx     Formulario para registrar / editar
    TransactionList.tsx       Lista de movimientos agrupada por día
  data/
    gastos.ts                 Inserción, edición, borrado y consultas en Supabase
  hooks/                      Conexión, instalación, consultas a Supabase, ancho de gráficas
  lib/
    supabase.ts               Cliente de Supabase
    sync.ts                   Cola de cambios pendientes y sincronización
    store.ts                  Copia local de los datos (localStorage)
    stats.ts                  Totales, saldo, series mensuales, por categoría
    money.ts                  Formato y lectura de montos (se guardan en centavos)
    dates.ts                  Utilidades de meses y fechas
```
