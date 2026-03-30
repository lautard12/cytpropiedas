export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      conceptos_liquidacion: {
        Row: {
          aplica_al_inquilino: boolean
          concepto: string
          id: string
          liquidacion_id: string
          monto: number
          responsable: string
        }
        Insert: {
          aplica_al_inquilino?: boolean
          concepto: string
          id?: string
          liquidacion_id: string
          monto?: number
          responsable?: string
        }
        Update: {
          aplica_al_inquilino?: boolean
          concepto?: string
          id?: string
          liquidacion_id?: string
          monto?: number
          responsable?: string
        }
        Relationships: [
          {
            foreignKeyName: "conceptos_liquidacion_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          alquiler_base: number
          api: string
          codigo: string
          comision_porcentaje: number
          created_at: string
          dia_vencimiento: number
          estado: Database["public"]["Enums"]["estado_contrato"]
          expensas_extraordinarias: string
          expensas_ordinarias: string
          fecha_fin: string
          fecha_inicio: string
          frecuencia_ajuste: string
          id: string
          inquilino_id: string | null
          iva: boolean
          propiedad_id: string | null
          propietario_id: string | null
          reglas_observaciones: string
          seguro: string
          servicios: string
          tgi: string
          tipo_ajuste: string
        }
        Insert: {
          alquiler_base?: number
          api?: string
          codigo: string
          comision_porcentaje?: number
          created_at?: string
          dia_vencimiento?: number
          estado?: Database["public"]["Enums"]["estado_contrato"]
          expensas_extraordinarias?: string
          expensas_ordinarias?: string
          fecha_fin: string
          fecha_inicio: string
          frecuencia_ajuste?: string
          id?: string
          inquilino_id?: string | null
          iva?: boolean
          propiedad_id?: string | null
          propietario_id?: string | null
          reglas_observaciones?: string
          seguro?: string
          servicios?: string
          tgi?: string
          tipo_ajuste?: string
        }
        Update: {
          alquiler_base?: number
          api?: string
          codigo?: string
          comision_porcentaje?: number
          created_at?: string
          dia_vencimiento?: number
          estado?: Database["public"]["Enums"]["estado_contrato"]
          expensas_extraordinarias?: string
          expensas_ordinarias?: string
          fecha_fin?: string
          fecha_inicio?: string
          frecuencia_ajuste?: string
          id?: string
          inquilino_id?: string | null
          iva?: boolean
          propiedad_id?: string | null
          propietario_id?: string | null
          reglas_observaciones?: string
          seguro?: string
          servicios?: string
          tgi?: string
          tipo_ajuste?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_inquilino_id_fkey"
            columns: ["inquilino_id"]
            isOneToOne: false
            referencedRelation: "inquilinos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inquilinos: {
        Row: {
          created_at: string
          dni: string
          email: string
          garante: string
          garante_telefono: string
          id: string
          nombre: string
          telefono: string
        }
        Insert: {
          created_at?: string
          dni?: string
          email?: string
          garante?: string
          garante_telefono?: string
          id?: string
          nombre: string
          telefono?: string
        }
        Update: {
          created_at?: string
          dni?: string
          email?: string
          garante?: string
          garante_telefono?: string
          id?: string
          nombre?: string
          telefono?: string
        }
        Relationships: []
      }
      liquidaciones: {
        Row: {
          comision_inmobiliaria: number
          contrato_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_liquidacion"]
          fecha_emision: string
          id: string
          neto_propietario: number
          observaciones: string
          pendiente: number
          periodo: string
          periodo_label: string
          saldo_anterior: number
          subtotal: number
          total_cobrado: number
          total_cobrar: number
        }
        Insert: {
          comision_inmobiliaria?: number
          contrato_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_liquidacion"]
          fecha_emision?: string
          id?: string
          neto_propietario?: number
          observaciones?: string
          pendiente?: number
          periodo: string
          periodo_label: string
          saldo_anterior?: number
          subtotal?: number
          total_cobrado?: number
          total_cobrar?: number
        }
        Update: {
          comision_inmobiliaria?: number
          contrato_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_liquidacion"]
          fecha_emision?: string
          id?: string
          neto_propietario?: number
          observaciones?: string
          pendiente?: number
          periodo?: string
          periodo_label?: string
          saldo_anterior?: number
          subtotal?: number
          total_cobrado?: number
          total_cobrar?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          contrato_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pago"]
          fecha: string
          id: string
          liquidacion_id: string
          medio_pago: Database["public"]["Enums"]["medio_pago"]
          monto: number
          observaciones: string
          referencia: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          fecha?: string
          id?: string
          liquidacion_id: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"]
          monto?: number
          observaciones?: string
          referencia?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          fecha?: string
          id?: string
          liquidacion_id?: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"]
          monto?: number
          observaciones?: string
          referencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      propiedades: {
        Row: {
          ambientes: number
          contrato_activo_id: string | null
          created_at: string
          direccion: string
          estado: Database["public"]["Enums"]["estado_propiedad"]
          id: string
          metros: number
          observaciones: string
          propietario_id: string | null
          tipo: Database["public"]["Enums"]["tipo_propiedad"]
          unidad: string
        }
        Insert: {
          ambientes?: number
          contrato_activo_id?: string | null
          created_at?: string
          direccion: string
          estado?: Database["public"]["Enums"]["estado_propiedad"]
          id?: string
          metros?: number
          observaciones?: string
          propietario_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_propiedad"]
          unidad?: string
        }
        Update: {
          ambientes?: number
          contrato_activo_id?: string | null
          created_at?: string
          direccion?: string
          estado?: Database["public"]["Enums"]["estado_propiedad"]
          id?: string
          metros?: number
          observaciones?: string
          propietario_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_propiedad"]
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contrato_activo"
            columns: ["contrato_activo_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
        ]
      }
      propietarios: {
        Row: {
          banco: string
          cbu: string
          created_at: string
          cuit: string
          direccion: string
          email: string
          id: string
          nombre: string
          telefono: string
        }
        Insert: {
          banco?: string
          cbu?: string
          created_at?: string
          cuit?: string
          direccion?: string
          email?: string
          id?: string
          nombre: string
          telefono?: string
        }
        Update: {
          banco?: string
          cbu?: string
          created_at?: string
          cuit?: string
          direccion?: string
          email?: string
          id?: string
          nombre?: string
          telefono?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_contrato: "Activo" | "Vencido" | "Por vencer" | "Rescindido"
      estado_liquidacion:
        | "Borrador"
        | "Pendiente"
        | "Parcial"
        | "Cobrada"
        | "Transferida"
      estado_pago: "Confirmado" | "Pendiente" | "Rechazado"
      estado_propiedad: "Ocupada" | "Vacante" | "En refacción"
      medio_pago: "Transferencia" | "Efectivo" | "Cheque" | "Depósito"
      tipo_propiedad: "Departamento" | "Casa" | "Local" | "Oficina" | "PH"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_contrato: ["Activo", "Vencido", "Por vencer", "Rescindido"],
      estado_liquidacion: [
        "Borrador",
        "Pendiente",
        "Parcial",
        "Cobrada",
        "Transferida",
      ],
      estado_pago: ["Confirmado", "Pendiente", "Rechazado"],
      estado_propiedad: ["Ocupada", "Vacante", "En refacción"],
      medio_pago: ["Transferencia", "Efectivo", "Cheque", "Depósito"],
      tipo_propiedad: ["Departamento", "Casa", "Local", "Oficina", "PH"],
    },
  },
} as const
