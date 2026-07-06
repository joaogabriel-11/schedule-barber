import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Fetch appointments that are past their end time and still have AGENDADO status
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        usuarioId: session.user.id,
        status: "AGENDADO",
      },
      include: {
        cliente: true,
        servico: true,
      },
    });

    // Filter appointments where the end time has passed
    const notificacoes = agendamentos.filter((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const fimAgendamento = new Date(
        dataHora.getTime() + agendamento.servico.duracaoMin * 60000
      );
      return fimAgendamento < now;
    });

    return NextResponse.json(notificacoes);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar notificações" },
      { status: 500 }
    );
  }
}
