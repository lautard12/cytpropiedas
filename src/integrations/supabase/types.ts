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
        Relationships: [
          {
            foreignKeyName: "auditoria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
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
      consultas_mora: {
        Row: {
          contrato_id: string
          created_at: string
          decidido_por: string | null
          dias_atraso: number
          estado: string
          fecha_consulta: string
          fecha_respuesta: string | null
          id: string
          liquidacion_id: string
          monto_estimado: number
          observaciones: string
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          decidido_por?: string | null
          dias_atraso?: number
          estado?: string
          fecha_consulta?: string
          fecha_respuesta?: string | null
          id?: string
          liquidacion_id: string
          monto_estimado?: number
          observaciones?: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          decidido_por?: string | null
          dias_atraso?: number
          estado?: string
          fecha_consulta?: string
          fecha_respuesta?: string | null
          id?: string
          liquidacion_id?: string
          monto_estimado?: number
          observaciones?: string
          updated_at?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          alquiler_base: number
          api: string
          clausulas_particulares: string
          codigo: string
          comision_porcentaje: number
          created_at: string
          destino_cobro: string
          dia_vencimiento: number
          dias_gracia_mora: number
          estado: Database["public"]["Enums"]["estado_contrato"]
          expensas_extraordinarias: string
          expensas_ordinarias: string
          fecha_fin: string
          fecha_inicio: string
          frecuencia_ajuste: string
          id: string
          indice_ajuste: Database["public"]["Enums"]["indice_ajuste"]
          inquilino_id: string | null
          iva: boolean
          medios_pago_aceptados: string[]
          moneda: Database["public"]["Enums"]["moneda"]
          multa_rescision_observaciones: string
          multa_rescision_porcentaje: number
          permite_rescision_anticipada: boolean
          propiedad_id: string | null
          propietario_id: string | null
          reglas_observaciones: string
          seguro: string
          servicios: string
          tasa_mora_diaria: number
          tgi: string
          tipo_ajuste: string
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
        }
        Insert: {
          alquiler_base?: number
          api?: string
          clausulas_particulares?: string
          codigo: string
          comision_porcentaje?: number
          created_at?: string
          destino_cobro?: string
          dia_vencimiento?: number
          dias_gracia_mora?: number
          estado?: Database["public"]["Enums"]["estado_contrato"]
          expensas_extraordinarias?: string
          expensas_ordinarias?: string
          fecha_fin: string
          fecha_inicio: string
          frecuencia_ajuste?: string
          id?: string
          indice_ajuste?: Database["public"]["Enums"]["indice_ajuste"]
          inquilino_id?: string | null
          iva?: boolean
          medios_pago_aceptados?: string[]
          moneda?: Database["public"]["Enums"]["moneda"]
          multa_rescision_observaciones?: string
          multa_rescision_porcentaje?: number
          permite_rescision_anticipada?: boolean
          propiedad_id?: string | null
          propietario_id?: string | null
          reglas_observaciones?: string
          seguro?: string
          servicios?: string
          tasa_mora_diaria?: number
          tgi?: string
          tipo_ajuste?: string
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
        }
        Update: {
          alquiler_base?: number
          api?: string
          clausulas_particulares?: string
          codigo?: string
          comision_porcentaje?: number
          created_at?: string
          destino_cobro?: string
          dia_vencimiento?: number
          dias_gracia_mora?: number
          estado?: Database["public"]["Enums"]["estado_contrato"]
          expensas_extraordinarias?: string
          expensas_ordinarias?: string
          fecha_fin?: string
          fecha_inicio?: string
          frecuencia_ajuste?: string
          id?: string
          indice_ajuste?: Database["public"]["Enums"]["indice_ajuste"]
          inquilino_id?: string | null
          iva?: boolean
          medios_pago_aceptados?: string[]
          moneda?: Database["public"]["Enums"]["moneda"]
          multa_rescision_observaciones?: string
          multa_rescision_porcentaje?: number
          permite_rescision_anticipada?: boolean
          propiedad_id?: string | null
          propietario_id?: string | null
          reglas_observaciones?: string
          seguro?: string
          servicios?: string
          tasa_mora_diaria?: number
          tgi?: string
          tipo_ajuste?: string
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
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
      cotizaciones_usd: {
        Row: {
          created_at: string
          fecha: string
          fuente: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_cotizacion"]
          valor_compra: number
          valor_venta: number
        }
        Insert: {
          created_at?: string
          fecha?: string
          fuente?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_cotizacion"]
          valor_compra?: number
          valor_venta: number
        }
        Update: {
          created_at?: string
          fecha?: string
          fuente?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_cotizacion"]
          valor_compra?: number
          valor_venta?: number
        }
        Relationships: []
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
      garantias_contrato: {
        Row: {
          aseguradora: string
          contrato_id: string
          created_at: string
          descripcion: string
          documento_url: string | null
          empleador: string
          estado: Database["public"]["Enums"]["estado_garantia"]
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: string
          monto_cobertura: number | null
          numero_poliza: string
          observaciones: string
          persona_id: string | null
          tipo: Database["public"]["Enums"]["tipo_garantia"]
          updated_at: string
        }
        Insert: {
          aseguradora?: string
          contrato_id: string
          created_at?: string
          descripcion?: string
          documento_url?: string | null
          empleador?: string
          estado?: Database["public"]["Enums"]["estado_garantia"]
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          monto_cobertura?: number | null
          numero_poliza?: string
          observaciones?: string
          persona_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_garantia"]
          updated_at?: string
        }
        Update: {
          aseguradora?: string
          contrato_id?: string
          created_at?: string
          descripcion?: string
          documento_url?: string | null
          empleador?: string
          estado?: Database["public"]["Enums"]["estado_garantia"]
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          monto_cobertura?: number | null
          numero_poliza?: string
          observaciones?: string
          persona_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_garantia"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garantias_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_contrato_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
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
          moneda: Database["public"]["Enums"]["moneda"]
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
          moneda?: Database["public"]["Enums"]["moneda"]
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
          moneda?: Database["public"]["Enums"]["moneda"]
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
          cotizacion: number | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_pago"]
          fecha: string
          genera_factura: boolean
          id: string
          iva_comision: number
          liquidacion_id: string
          medio_pago: Database["public"]["Enums"]["medio_pago"]
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          numero_factura: string
          observaciones: string
          referencia: string
          tipo_factura: string | null
        }
        Insert: {
          contrato_id: string
          cotizacion?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          fecha?: string
          genera_factura?: boolean
          id?: string
          iva_comision?: number
          liquidacion_id: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"]
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          numero_factura?: string
          observaciones?: string
          referencia?: string
          tipo_factura?: string | null
        }
        Update: {
          contrato_id?: string
          cotizacion?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          fecha?: string
          genera_factura?: boolean
          id?: string
          iva_comision?: number
          liquidacion_id?: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"]
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          numero_factura?: string
          observaciones?: string
          referencia?: string
          tipo_factura?: string | null
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
      personal: {
        Row: {
          activo: boolean
          causa_alta: string
          causa_baja: string | null
          created_at: string
          fecha_alta: string
          fecha_baja: string | null
          id: string
          observaciones: string
          persona_id: string
          sucursal_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          causa_alta?: string
          causa_baja?: string | null
          created_at?: string
          fecha_alta?: string
          fecha_baja?: string | null
          id?: string
          observaciones?: string
          persona_id: string
          sucursal_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          causa_alta?: string
          causa_baja?: string | null
          created_at?: string
          fecha_alta?: string
          fecha_baja?: string | null
          id?: string
          observaciones?: string
          persona_id?: string
          sucursal_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
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
      plantillas_contrato: {
        Row: {
          activa: boolean
          clausulas: string
          created_at: string
          descripcion: string
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_contrato"]
          updated_at: string
        }
        Insert: {
          activa?: boolean
          clausulas?: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Update: {
          activa?: boolean
          clausulas?: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Relationships: []
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
      rendiciones_propietario: {
        Row: {
          comision_retenida: number
          comprobante_url: string | null
          created_at: string
          estado: string
          fecha_acreditacion: string
          fecha_transferencia: string | null
          id: string
          iva_retenido: number
          liquidacion_id: string
          medio: Database["public"]["Enums"]["medio_pago"]
          monto_neto: number
          observaciones: string
          propietario_id: string | null
          referencia: string
          updated_at: string
        }
        Insert: {
          comision_retenida?: number
          comprobante_url?: string | null
          created_at?: string
          estado?: string
          fecha_acreditacion?: string
          fecha_transferencia?: string | null
          id?: string
          iva_retenido?: number
          liquidacion_id: string
          medio?: Database["public"]["Enums"]["medio_pago"]
          monto_neto?: number
          observaciones?: string
          propietario_id?: string | null
          referencia?: string
          updated_at?: string
        }
        Update: {
          comision_retenida?: number
          comprobante_url?: string | null
          created_at?: string
          estado?: string
          fecha_acreditacion?: string
          fecha_transferencia?: string | null
          id?: string
          iva_retenido?: number
          liquidacion_id?: string
          medio?: Database["public"]["Enums"]["medio_pago"]
          monto_neto?: number
          observaciones?: string
          propietario_id?: string | null
          referencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      renovaciones_contrato: {
        Row: {
          contrato_id: string
          contrato_nuevo_id: string | null
          created_at: string
          fecha_consulta: string
          fecha_respuesta_inquilino: string | null
          fecha_respuesta_propietario: string | null
          id: string
          observaciones: string
          respuesta_inquilino: Database["public"]["Enums"]["respuesta_renovacion"]
          respuesta_propietario: Database["public"]["Enums"]["respuesta_renovacion"]
          resultado: Database["public"]["Enums"]["resultado_renovacion"]
          updated_at: string
        }
        Insert: {
          contrato_id: string
          contrato_nuevo_id?: string | null
          created_at?: string
          fecha_consulta?: string
          fecha_respuesta_inquilino?: string | null
          fecha_respuesta_propietario?: string | null
          id?: string
          observaciones?: string
          respuesta_inquilino?: Database["public"]["Enums"]["respuesta_renovacion"]
          respuesta_propietario?: Database["public"]["Enums"]["respuesta_renovacion"]
          resultado?: Database["public"]["Enums"]["resultado_renovacion"]
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          contrato_nuevo_id?: string | null
          created_at?: string
          fecha_consulta?: string
          fecha_respuesta_inquilino?: string | null
          fecha_respuesta_propietario?: string | null
          id?: string
          observaciones?: string
          respuesta_inquilino?: Database["public"]["Enums"]["respuesta_renovacion"]
          respuesta_propietario?: Database["public"]["Enums"]["respuesta_renovacion"]
          resultado?: Database["public"]["Enums"]["resultado_renovacion"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renovaciones_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_contrato_contrato_nuevo_id_fkey"
            columns: ["contrato_nuevo_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisiones: {
        Row: {
          contrato_id: string
          created_at: string
          fecha_efectiva: string
          id: string
          liquidacion_multa_id: string | null
          meses_restantes: number
          motivo: string
          multa_monto: number
          multa_porcentaje: number
          valor_restante: number
        }
        Insert: {
          contrato_id: string
          created_at?: string
          fecha_efectiva: string
          id?: string
          liquidacion_multa_id?: string | null
          meses_restantes?: number
          motivo?: string
          multa_monto?: number
          multa_porcentaje?: number
          valor_restante?: number
        }
        Update: {
          contrato_id?: string
          created_at?: string
          fecha_efectiva?: string
          id?: string
          liquidacion_multa_id?: string | null
          meses_restantes?: number
          motivo?: string
          multa_monto?: number
          multa_porcentaje?: number
          valor_restante?: number
        }
        Relationships: [
          {
            foreignKeyName: "rescisiones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisiones_liquidacion_multa_id_fkey"
            columns: ["liquidacion_multa_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          codigo: Database["public"]["Enums"]["app_role"]
          created_at: string
          descripcion: string
          id: string
          nombre: string
        }
        Insert: {
          codigo: Database["public"]["Enums"]["app_role"]
          created_at?: string
          descripcion?: string
          id?: string
          nombre: string
        }
        Update: {
          codigo?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          descripcion?: string
          id?: string
          nombre?: string
        }
        Relationships: []
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
          role_id: string
          sucursal_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          role_id: string
          sucursal_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string
          sucursal_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          persona_id: string | null
          ultimo_login: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre?: string
          persona_id?: string | null
          ultimo_login?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          persona_id?: string | null
          ultimo_login?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: true
            referencedRelation: "personas"
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
      aplicar_punitorios: { Args: { _liquidacion_id: string }; Returns: Json }
      calcular_punitorio: {
        Args: { _fecha?: string; _liquidacion_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_acreditada: {
        Args: { _fecha_acreditacion?: string; _liquidacion_id: string }
        Returns: Json
      }
      marcar_garantias_vencidas: { Args: never; Returns: number }
      rendir_propietario: {
        Args: {
          _comprobante_url?: string
          _fecha_transferencia: string
          _liquidacion_id: string
          _medio: Database["public"]["Enums"]["medio_pago"]
          _observaciones?: string
          _referencia: string
        }
        Returns: Json
      }
      rescindir_contrato: {
        Args: { _contrato_id: string; _fecha_efectiva: string; _motivo: string }
        Returns: Json
      }
      resolver_consulta_mora: {
        Args: {
          _aprobada: boolean
          _consulta_id: string
          _observaciones?: string
        }
        Returns: Json
      }
      solicitar_autorizacion_mora: {
        Args: { _liquidacion_id: string; _observaciones?: string }
        Returns: Json
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
      estado_garantia: "Vigente" | "Vencida" | "Reemplazada" | "Anulada"
      estado_liquidacion:
        | "Borrador"
        | "Pendiente"
        | "Parcial"
        | "Cobrada"
        | "Acreditada"
        | "Transferida"
      estado_pago: "Confirmado" | "Pendiente" | "Rechazado"
      estado_propiedad: "Ocupada" | "Vacante" | "En refacción"
      indice_ajuste: "ICL" | "IPC" | "Libre acuerdo"
      medio_pago: "Transferencia" | "Efectivo" | "Cheque" | "Depósito"
      moneda: "ARS" | "USD"
      respuesta_renovacion: "Pendiente" | "Acepta" | "Rechaza"
      resultado_renovacion: "Pendiente" | "Renovado" | "No_Renovado"
      tipo_contrato: "Vivienda" | "Comercial" | "Temporario"
      tipo_cotizacion: "Oficial" | "MEP" | "Blue" | "CCL"
      tipo_garantia:
        | "Propietaria"
        | "Garante"
        | "Seguro_Caucion"
        | "Recibo_Sueldo"
        | "Otro"
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
      estado_garantia: ["Vigente", "Vencida", "Reemplazada", "Anulada"],
      estado_liquidacion: [
        "Borrador",
        "Pendiente",
        "Parcial",
        "Cobrada",
        "Acreditada",
        "Transferida",
      ],
      estado_pago: ["Confirmado", "Pendiente", "Rechazado"],
      estado_propiedad: ["Ocupada", "Vacante", "En refacción"],
      indice_ajuste: ["ICL", "IPC", "Libre acuerdo"],
      medio_pago: ["Transferencia", "Efectivo", "Cheque", "Depósito"],
      moneda: ["ARS", "USD"],
      respuesta_renovacion: ["Pendiente", "Acepta", "Rechaza"],
      resultado_renovacion: ["Pendiente", "Renovado", "No_Renovado"],
      tipo_contrato: ["Vivienda", "Comercial", "Temporario"],
      tipo_cotizacion: ["Oficial", "MEP", "Blue", "CCL"],
      tipo_garantia: [
        "Propietaria",
        "Garante",
        "Seguro_Caucion",
        "Recibo_Sueldo",
        "Otro",
      ],
      tipo_propiedad: ["Departamento", "Casa", "Local", "Oficina", "PH"],
    },
  },
} as const
