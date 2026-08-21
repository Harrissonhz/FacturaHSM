"use client";

// Boton que dispara la impresion / guardar como PDF del navegador.
// En movil, "Imprimir" ofrece "Guardar como PDF".
export default function PrintButton() {
  return (
    <button className="btn btn-success" onClick={() => window.print()}>
      🖨️ Imprimir / Guardar PDF
    </button>
  );
}
