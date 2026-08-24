"use client";

// Selector de variante para la trazabilidad. Al cambiar, navega con ?v=<id>.
import { useRouter } from "next/navigation";

type Variante = { id: string; sku: string };

export default function TrazabilidadSelector({
  variantes,
  seleccion,
}: {
  variantes: Variante[];
  seleccion: string;
}) {
  const router = useRouter();

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor="variante">Selecciona una variante (SKU)</label>
      <select
        id="variante"
        className="select"
        value={seleccion}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/reportes/trazabilidad?v=${v}` : "/reportes/trazabilidad");
        }}
      >
        <option value="">— Selecciona —</option>
        {variantes.map((v) => (
          <option key={v.id} value={v.id}>{v.sku}</option>
        ))}
      </select>
    </div>
  );
}
