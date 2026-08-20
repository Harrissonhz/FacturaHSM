// ---------------------------------------------------------------------
// Tipos de la base de datos.
//
// IMPORTANTE: este archivo es un PLACEHOLDER minimo para que el proyecto
// compile antes de generar los tipos reales. Genera los tipos definitivos
// desde tu esquema Supabase con:
//
//   npm run gen:types
//   (equivale a: supabase gen types typescript --linked > src/types/database.ts)
//
// Eso sobrescribira este archivo con los tipos completos de todas las
// tablas, vistas y funciones RPC.
// ---------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Los tipos completos se generan con `npm run gen:types`.
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: {
      [key: string]: { Row: Record<string, unknown> };
    };
    Functions: {
      sp_registrar_venta: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      sp_registrar_abono: {
        Args: {
          p_cuenta_id: string;
          p_monto: number;
          p_forma_pago: string;
          p_comprobante_url?: string | null;
          p_observacion?: string | null;
        };
        Returns: Json;
      };
      sp_recibir_mercancia: {
        Args: { p_compra_id: string; p_items: Json };
        Returns: string;
      };
      sp_ejecutar_produccion: {
        Args: { p_orden_id: string; p_resultados: Json };
        Returns: undefined;
      };
      sp_transferir_inventario: {
        Args: { p_transferencia_id: string };
        Returns: undefined;
      };
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: Record<string, unknown> };
  };
}
