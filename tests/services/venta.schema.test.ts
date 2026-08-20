import { describe, it, expect } from "vitest";
import { registrarVentaSchema } from "@/lib/validation/venta.schema";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("registrarVentaSchema", () => {
  it("acepta una venta valida a credito", () => {
    const r = registrarVentaSchema.safeParse({
      vendedor_id: UUID,
      cliente_id: UUID,
      tipo_pago: "CREDITO",
      dias_credito: 30,
      descuento: 0,
      items: [
        { variante_id: UUID, calidad_id: UUID, cantidad: 10, precio_unitario: 70000 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza una venta sin items (regla R-VEN)", () => {
    const r = registrarVentaSchema.safeParse({
      vendedor_id: UUID,
      cliente_id: UUID,
      tipo_pago: "CREDITO",
      dias_credito: 0,
      descuento: 0,
      items: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza cantidad <= 0", () => {
    const r = registrarVentaSchema.safeParse({
      vendedor_id: UUID,
      cliente_id: UUID,
      items: [{ variante_id: UUID, calidad_id: UUID, cantidad: 0, precio_unitario: 100 }],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza precio unitario negativo", () => {
    const r = registrarVentaSchema.safeParse({
      vendedor_id: UUID,
      cliente_id: UUID,
      items: [{ variante_id: UUID, calidad_id: UUID, cantidad: 1, precio_unitario: -5 }],
    });
    expect(r.success).toBe(false);
  });
});
