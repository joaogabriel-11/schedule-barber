export function formatarTelefone(telefone: string) {
  const digits = telefone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return telefone;
}

export function validarTelefone(telefone: unknown) {
  if (typeof telefone !== "string") {
    return false;
  }

  const digits = telefone.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export function validarEmailCliente(email: unknown) {
  if (!email) {
    return true;
  }

  if (typeof email !== "string") {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function normalizarEmailCliente(email: unknown) {
  if (typeof email !== "string" || !email.trim()) {
    return null;
  }

  return email.trim().toLowerCase();
}
