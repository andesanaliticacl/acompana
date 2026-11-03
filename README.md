# Acompaña

Gestión de turnos, personal, pagos y caja para ACALI (hogares de adultos mayores, con varias sedes). Reemplaza el cuaderno y el Excel.

> **Estado: demo.** Los datos viven en el navegador (localStorage). La app **parte en blanco**; en Hoy (o Ajustes) está
> "Llenar con datos de ejemplo" para mostrarla. Fase 2: conectar Supabase (`supabase/schema.sql`).

## Qué hace

Regla de 3: el menú tiene solo **Turnos** (Hoy · Calendario), **Personas** (Personal · Clientes) y **Dinero** (Pagos · Caja). Lo secundario va en "Más". En Turnos, un botón cambia de **sede** o a **Particulares** (clientes particulares con sus cuidadoras, sin pisos).

| Pantalla | Para qué |
|---|---|
| **Hoy** | Quién cuida en cada turno hoy, marcar *Llegó / Tarde / No vino* con un toque, turnos sin cubrir de los próximos 7 días y lo que falta pagar en la quincena. |
| **Calendario** | **Día a día**: eliges un día y ves el turno Día y Noche **por piso** o **por cliente**, con los cupos libres marcados. **Semana por cuidadora**: planilla con una fila por cuidadora. **Buscador general** (Ctrl+K) para cuidadoras, residentes y clientes. Asignación de varias cuidadoras a la vez, copiar semana anterior, exportar a Excel. |
| **Clientes** | Apoderados que contratan: teléfono, cobro semanal y si ya pagó la semana. Cada uno tiene a cargo uno o más **residentes** (piso, edad, cuidados, cuántas cuidadoras necesita de día y de noche). |
| **Personal** | Áreas: Piso (salud), Cocina y Aseo en las sedes de ACALI, y Particular para clientes particulares. Etiqueta Emergencia (pago diario). Ficha con edad, experiencia, valoración de la dueña (estrellas), rasgos (amable, puntual, seria, impuntual…), descripción, notas privadas. Asistencia y **puntualidad real** calculadas de lo que se marca cada día. WhatsApp / llamar. |
| **Pagos** | Por turno más horas extra rellenables (las faltas no se pagan). Quincenal (1–15 y 16–fin de mes), y diario para el personal de emergencia. Bono o descuento, marcar pagado, avisar por WhatsApp. Excel con sede y área. |
| **Caja** | Ingresos (familias/clientes) y gastos por semana o mes. Los pagos a cuidadoras entran solos como gasto. "Te queda" = ganancia. |
| **Ajustes** | Nombre, horarios de turnos, sedes y sus pisos, reiniciar datos de ejemplo. |
| **Tutorial** | Botón "Tutorial" en el menú: recorrido guiado que ilumina cada parte y explica para qué sirve. Se cierra con "Cerrar tutorial". |
| **Tema** | Claro, oscuro o automático (sigue al teléfono). En "Más" → Modo oscuro/claro, o en Ajustes. |
| **Celular** | Ventanas tipo hoja que se cierran deslizando hacia abajo, transiciones suaves, vibración al marcar asistencia o pagar, instalable en la pantalla de inicio. |

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy en Vercel

Importar la carpeta/repo en Vercel: detecta Vite (`vercel.json` ya incluido). Sin variables de entorno en la demo.

## Fase 2 · Supabase

1. Correr `supabase/schema.sql` en el proyecto.
2. Reemplazar `cargar / upsert / remove` en `src/state/store.tsx` por llamadas a `@supabase/supabase-js`
   (las pantallas solo usan `useStore()`, no cambian).
3. Login de la dueña con Supabase Auth (magic link al correo es lo más simple para ella).
