"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-full" type="submit" disabled={pending}>
      {pending ? "Ingresando..." : "Iniciar sesion"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <main className="login-wrap">
      <div className="login-card">
        <h1>FacturacionHSM</h1>
        <p className="muted">Inicia sesion para continuar</p>

        <form action={formAction} className="login-form">
          <label>
            Correo
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="tucorreo@grupo-exito.com"
              required
            />
          </label>

          <label>
            Contrasena
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="********"
              required
            />
          </label>

          {state.error && <p className="error">{state.error}</p>}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
