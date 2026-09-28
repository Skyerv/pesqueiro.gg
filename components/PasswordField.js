"use client";

import { useId, useState } from "react";

export default function PasswordField({
  id,
  name = "password",
  label = "Senha",
  autoComplete = "current-password",
  minLength,
  required = true,
  hint,
}) {
  const autoId = useId();
  const inputId = id || `senha-${autoId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="pw">
        <input
          id={inputId}
          name={name}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          aria-describedby={hintId}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setVisivel((v) => !v)}
          aria-pressed={visivel}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          title={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          {visivel ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {hint && <span id={hintId} className="hint">{hint}</span>}
    </div>
  );
}

function Eye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.7 3.72" />
      <path d="M6.1 6.1A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 4.2-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
