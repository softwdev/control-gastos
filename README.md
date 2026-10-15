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
  hooks/                      localStorage, conexión, instalación, ancho de gráficas
  lib/
    stats.ts                  Totales, saldo, series mensuales, por categoría
    money.ts                  Formato y lectura de montos (se guardan en centavos)
    dates.ts                  Utilidades de meses y fechas
```
