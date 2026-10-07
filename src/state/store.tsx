/**
 * Capa de datos de Acompaña.
 *
 * Hoy (modo demo) todo vive en localStorage del dispositivo. Para pasar a Supabase
 * basta con reemplazar `cargar`, `upsert` y `remove` por llamadas a las tablas de
 * supabase/schema.sql — las pantallas solo usan este hook `useStore()`.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DB } from '../lib/types';
import { crearSeed, dbVacia } from '../lib/seed';

const KEY = 'acompana-demo-v3';

type Coleccion = 'cuidadoras' | 'turnos' | 'pisos' | 'asignaciones' | 'pagos' | 'movimientos';
type Item<K extends Coleccion> = DB[K][number];

interface Store {
  db: DB;
  upsert: <K extends Coleccion>(col: K, item: Item<K>) => void;
  upsertMuchos: <K extends Coleccion>(col: K, items: Item<K>[]) => void;
  remove: (col: Coleccion, id: string) => void;
  setAjustes: (a: Partial<DB['ajustes']>) => void;
  reiniciar: (modo: 'demo' | 'vacio') => void;
}

const Ctx = createContext<Store | null>(null);

function cargar(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      return { ...db, pisos: db.pisos ?? [] };
    }
  } catch {
    /* sin almacenamiento: seguimos con datos de ejemplo */
  }
  return crearSeed();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(cargar);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* ignorar */
    }
  }, [db]);

  const upsertMuchos: Store['upsertMuchos'] = (col, items) =>
    setDb((d) => {
      const lista = [...(d[col] as Item<typeof col>[])];
      for (const it of items) {
        const i = lista.findIndex((x) => x.id === it.id);
        if (i >= 0) lista[i] = it;
        else lista.push(it);
      }
      return { ...d, [col]: lista } as DB;
    });

  const store: Store = {
    db,
    upsert: (col, item) => upsertMuchos(col, [item]),
    upsertMuchos,
    remove: (col, id) =>
      setDb((d) => ({ ...d, [col]: (d[col] as { id: string }[]).filter((x) => x.id !== id) }) as DB),
    setAjustes: (a) => setDb((d) => ({ ...d, ajustes: { ...d.ajustes, ...a } })),
    reiniciar: (modo) => setDb(modo === 'demo' ? crearSeed() : dbVacia()),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}
