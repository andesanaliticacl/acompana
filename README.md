# Acompaña

Gestión de turnos, pagos y caja para una empresa de cuidadoras de adultos mayores. Reemplaza el cuaderno y el Excel.

> **Estado: demo.** Los datos viven en el navegador (localStorage) y se cargan datos de ejemplo
> relativos a la fecha de hoy. Fase 2: conectar Supabase (`supabase/schema.sql`).

## Qué hace

| Pantalla | Para qué |
|---|---|
| **Hoy** | Quién cuida en cada turno hoy, marcar *Llegó / Tarde / No vino* con un toque, turnos sin cubrir de los próximos 7 días y total a pagar el domingo. |
| **Calendario** | **Día a día**: eliges un día y ves el turno Día y Noche, piso por piso, con los cupos libres marcados. **Semana por cuidadora**: planilla con una fila por persona. Asignación de varias cuidadoras a la vez, copiar semana anterior, exportar a Excel. |
| **Cuidadoras** | Ficha con edad, experiencia, valoración de la dueña (estrellas), rasgos (amable, puntual, seria, impuntual…), descripción, notas privadas. Asistencia y **puntualidad real** calculadas de lo que se marca cada día. WhatsApp / llamar. |
| **Pagos** | Cada domingo: horas × valor hora, bono o descuento, marcar pagado, avisar por WhatsApp. Export a Excel. |
| **Caja** | Ingresos (familias/clientes) y gastos por semana o mes. Los pagos a cuidadoras entran solos como gasto. "Te queda" = ganancia. |
| **Ajustes** | Nombre, editar o agregar turnos, reiniciar datos de ejemplo. |

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
