"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-full" type="submit" disabled={pending}>
      {pending ? "Ingresando..." : "Iniciar sesión"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="logo">HSM</div>
        <h1>FacturacionHSM</h1>
        <p className="muted">Inicia sesión para continuar</p>

        <form action={formAction}>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tucorreo@grupo-exito.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          {state.error && <div className="alert alert-danger">{state.error}</div>}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
