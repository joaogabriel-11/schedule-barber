interface WhatsAppAgendamentoParams {
  telefone: string;
  clienteNome: string;
  servicoNome: string;
  dataHora: string | Date;
}

function normalizarTelefoneWhatsApp(telefone: string) {
  const digits = telefone.replace(/\D/g, "");

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export function criarMensagemWhatsAppAgendamento({
  clienteNome,
  servicoNome,
  dataHora,
}: Omit<WhatsAppAgendamentoParams, "telefone">) {
  const data = new Date(dataHora);
  const dataFormatada = data.toLocaleDateString("pt-BR");
  const horaFormatada = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Olá, ${clienteNome}! Passando para lembrar que seu agendamento está marcado para ${dataFormatada} às ${horaFormatada}. Serviço: ${servicoNome}.`;
}

export function criarLinkWhatsAppAgendamento(params: WhatsAppAgendamentoParams) {
  const phone = normalizarTelefoneWhatsApp(params.telefone);
  const text = criarMensagemWhatsAppAgendamento(params);

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}
