// Esquemas de validacion (zod) para la venta. Se validan en la capa de
// servicios ANTES de invocar la RPC sp_registrar_venta.
import { z } from "zod";

export const ventaItemSchema = z.object({
  variante_id: z.string().uuid("variante_id debe ser un UUID valido"),
  calidad_id: z.string().uuid("calidad_id debe ser un UUID valido"),
  cantidad: z.number().int().positive("La cantidad debe ser un entero > 0"),
  precio_unitario: z
    .number()
    .nonnegative("El precio unitario no puede ser negativo"),
});

export const registrarVentaSchema = z.object({
  vendedor_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  tipo_pago: z.enum(["CONTADO", "CREDITO"]).default("CREDITO"),
  dias_credito: z.number().int().nonnegative().default(0),
  descuento: z.number().nonnegative().default(0),
  items: z.array(ventaItemSchema).min(1, "La venta debe tener al menos un item"),
});

export type RegistrarVentaInput = z.infer<typeof registrarVentaSchema>;
export type VentaItem = z.infer<typeof ventaItemSchema>;
