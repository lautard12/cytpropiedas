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
      auditoria: {
        Row: {
          accion: string
          created_at: string
          datos_antes: Json | null
          datos_despues: Json | null
          descripcion: string | null
          entidad: string
          entidad_id: string | null
          id: string
          monto: number | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          descripcion?: string | null
          entidad: string
          entidad_id?: string | null
          id?: string
          monto?: number | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          descripcion?: string | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          monto?: number | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      eventos_contrato: {
        Row: {
          categoria: string
          contrato_id: string
          created_at: string
          descripcion: string
          documento_url: string | null
          fecha: string
          id: string
          liquidacion_id: string | null
          monto: number | null
          periodo: string | null
          tipo: string
        }
        Insert: {
          categoria?: string
          contrato_id: string
          created_at?: string
          descripcion?: string
          documento_url?: string | null
          fecha: string
          id?: string
          liquidacion_id?: string | null
          monto?: number | null
          periodo?: string | null
          tipo: string
        }
        Update: {
          categoria?: string
          contrato_id?: string
          created_at?: string
          descripcion?: string
          documento_url?: string | null
          fecha?: string
          id?: string
          liquidacion_id?: string | null
          monto?: number | null
          periodo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_contrato_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inquilinos: {
        Row: {
          created_at: string
          garante_dni: string
          garante_nombre: string
          garante_telefono: string
          id: string
          ingresos_declarados: number
          observaciones_inquilino: string
          ocupacion: string
          persona_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          garante_dni?: string
          garante_nombre?: string
          garante_telefono?: string
          id?: string
          ingresos_declarados?: number
          observaciones_inquilino?: string
          ocupacion?: string
          persona_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          garante_dni?: string
          garante_nombre?: string
          garante_telefono?: string
          id?: string
          ingresos_declarados?: number
          observaciones_inquilino?: string
          ocupacion?: string
          persona_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquilinos_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: true
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
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
      organizacion: {
        Row: {
          created_at: string
          cuit: string | null
          direccion: string | null
          email: string | null
          fecha_alta: string
          fecha_baja: string | null
          id: string
          logo_url: string | null
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          fecha_alta?: string
          fecha_baja?: string | null
          id?: string
          logo_url?: string | null
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          fecha_alta?: string
          fecha_baja?: string | null
          id?: string
          logo_url?: string | null
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
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
      personas: {
        Row: {
          created_at: string
          cuit: string
          direccion: string
          dni: string
          email: string
          id: string
          nombre: string
          observaciones: string
          sucursal_id: string | null
          telefono: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cuit?: string
          direccion?: string
          dni?: string
          email?: string
          id?: string
          nombre: string
          observaciones?: string
          sucursal_id?: string | null
          telefono?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cuit?: string
          direccion?: string
          dni?: string
          email?: string
          id?: string
          nombre?: string
          observaciones?: string
          sucursal_id?: string | null
          telefono?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      personas_roles: {
        Row: {
          created_at: string
          id: string
          persona_id: string
          rol: Database["public"]["Enums"]["rol_persona"]
        }
        Insert: {
          created_at?: string
          id?: string
          persona_id: string
          rol: Database["public"]["Enums"]["rol_persona"]
        }
        Update: {
          created_at?: string
          id?: string
          persona_id?: string
          rol?: Database["public"]["Enums"]["rol_persona"]
        }
        Relationships: [
          {
            foreignKeyName: "personas_roles_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
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
          latitud: number | null
          longitud: number | null
          matricula_catastral: string | null
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
          latitud?: number | null
          longitud?: number | null
          matricula_catastral?: string | null
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
          latitud?: number | null
          longitud?: number | null
          matricula_catastral?: string | null
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
          alias_cbu: string
          banco: string
          cbu: string
          condicion_iva: string
          created_at: string
          id: string
          observaciones_fiscales: string
          persona_id: string
          updated_at: string
        }
        Insert: {
          alias_cbu?: string
          banco?: string
          cbu?: string
          condicion_iva?: string
          created_at?: string
          id?: string
          observaciones_fiscales?: string
          persona_id: string
          updated_at?: string
        }
        Update: {
          alias_cbu?: string
          banco?: string
          cbu?: string
          condicion_iva?: string
          created_at?: string
          id?: string
          observaciones_fiscales?: string
          persona_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "propietarios_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: true
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          activa: boolean
          created_at: string
          direccion: string | null
          es_central: boolean
          id: string
          nombre: string
          organizacion_id: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          es_central?: boolean
          id?: string
          nombre: string
          organizacion_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          es_central?: boolean
          id?: string
          nombre?: string
          organizacion_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          sucursal_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          sucursal_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          sucursal_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anular_pago: {
        Args: { _motivo?: string; _pago_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      upsert_inquilino: {
        Args: {
          _cuit: string
          _direccion: string
          _dni: string
          _email: string
          _garante_dni: string
          _garante_nombre: string
          _garante_telefono: string
          _ingresos_declarados: number
          _nombre: string
          _observaciones: string
          _observaciones_inquilino: string
          _ocupacion: string
          _persona_id: string
          _telefono: string
        }
        Returns: string
      }
      upsert_propietario: {
        Args: {
          _alias_cbu: string
          _banco: string
          _cbu: string
          _condicion_iva: string
          _cuit: string
          _direccion: string
          _dni: string
          _email: string
          _nombre: string
          _observaciones: string
          _observaciones_fiscales: string
          _persona_id: string
          _telefono: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "administrativo"
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
      rol_persona: "propietario" | "inquilino" | "garante" | "personal"
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
      app_role: ["admin", "administrativo"],
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
      rol_persona: ["propietario", "inquilino", "garante", "personal"],
      tipo_propiedad: ["Departamento", "Casa", "Local", "Oficina", "PH"],
    },
  },
} as const
