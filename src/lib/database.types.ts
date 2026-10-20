// Tipos generados a partir de la base de datos de Supabase (proyecto pwa-estudiante).
// Si cambias las tablas, vuelve a generarlos con:
//   npx supabase gen types typescript --project-id tywkxuqovnqvhfnvbipo > src/lib/database.types.ts

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      cg_categorias: {
        Row: {
          creado_en: string
          icono: string
          id: string
          nombre: string
          nombre_clave: string | null
          predeterminada: boolean
          tipo: string
        }
        Insert: {
          creado_en?: string
          icono: string
          id?: string
          nombre: string
          predeterminada?: boolean
          tipo: string
        }
        Update: {
          creado_en?: string
          icono?: string
          id?: string
          nombre?: string
          predeterminada?: boolean
          tipo?: string
        }
        Relationships: []
      }
      cg_movimientos: {
        Row: {
          actualizado_en: string
          categoria_id: string
          creado_en: string
          descripcion: string
          fecha: string
          id: string
          monto: number
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          categoria_id: string
          creado_en?: string
          descripcion?: string
          fecha: string
          id?: string
          monto: number
          tipo: string
        }
        Update: {
          actualizado_en?: string
          categoria_id?: string
          creado_en?: string
          descripcion?: string
          fecha?: string
          id?: string
          monto?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cg_movimientos_categoria_fk'
            columns: ['categoria_id', 'tipo']
            isOneToOne: false
            referencedRelation: 'cg_categorias'
            referencedColumns: ['id', 'tipo']
          },
        ]
      }
      ta_materias: {
        Row: {
          creado_en: string
          id: string
          nombre: string
          nombre_clave: string | null
        }
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      ta_tareas: {
        Row: {
          actualizado_en: string
          completada: boolean
          completada_en: string | null
          creado_en: string
          fecha_entrega: string
          id: string
          materia_id: string
          notas: string
          prioridad: string
          titulo: string
        }
        Insert: {
          actualizado_en?: string
          completada?: boolean
          completada_en?: string | null
          creado_en?: string
          fecha_entrega: string
          id?: string
          materia_id: string
          notas?: string
          prioridad: string
          titulo: string
        }
        Update: {
          actualizado_en?: string
          completada?: boolean
          completada_en?: string | null
          creado_en?: string
          fecha_entrega?: string
          id?: string
          materia_id?: string
          notas?: string
          prioridad?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ta_tareas_materia_id_fkey'
            columns: ['materia_id']
            isOneToOne: false
            referencedRelation: 'ta_materias'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      cg_resumen_mensual: {
        Row: {
          gastos: number | null
          ingresos: number | null
          mes: string | null
          movimientos: number | null
        }
        Relationships: []
      }
      cg_saldo: {
        Row: {
          gastos: number | null
          ingresos: number | null
          saldo: number | null
        }
        Relationships: []
      }
      cg_totales_por_categoria: {
        Row: {
          categoria_id: string | null
          icono: string | null
          mes: string | null
          movimientos: number | null
          nombre: string | null
          tipo: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
