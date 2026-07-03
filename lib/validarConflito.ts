import { prisma } from "./prisma";

interface ConflitoAgendamento {
  id: string;
  dataHora: Date;
  duracaoMin: number;
}

export async function validarConflitoAgendamento(
  usuarioId: string,
  dataHora: Date,
  duracaoMin: number,
  agendamentoIdExcluir?: string
): Promise<{ temConflito: boolean; conflitoCom?: ConflitoAgendamento }> {
  const inicioNovo = dataHora;
  const fimNovo = new Date(dataHora.getTime() + duracaoMin * 60000);

  const agendamentosConflitantes = await prisma.agendamento.findMany({
    where: {
      usuarioId,
      id: agendamentoIdExcluir ? { not: agendamentoIdExcluir } : undefined,
      status: { not: "CANCELADO" },
      OR: [
        {
          dataHora: { lt: fimNovo }
        },
        {
          dataHora: { gte: inicioNovo }
        }
      ]
    },
    include: {
      servico: true
    }
  });

  for (const agendamento of agendamentosConflitantes) {
    const inicioExistente = agendamento.dataHora;
    const fimExistente = new Date(
      agendamento.dataHora.getTime() + agendamento.servico.duracaoMin * 60000
    );

    const conflito = inicioNovo < fimExistente && fimNovo > inicioExistente;

    if (conflito) {
      return {
        temConflito: true,
        conflitoCom: {
          id: agendamento.id,
          dataHora: agendamento.dataHora,
          duracaoMin: agendamento.servico.duracaoMin
        }
      };
    }
  }

  return { temConflito: false };
}
