"use client";

// Botón para imprimir / guardar como PDF (estado de cuenta).
export default function PrintButton() {
  return (
    <button className="btn btn-success" onClick={() => window.print()}>
      🖨️ Imprimir / Guardar PDF
    </button>
  );
}
