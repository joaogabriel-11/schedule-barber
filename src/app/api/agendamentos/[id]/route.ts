import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../../lib/auth-helper";
import { validarConflitoAgendamento } from "../../../../../lib/validarConflito";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        cliente: true,
        servico: true,
      },
    });

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 },
      );
    }

    if (agendamento.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    return NextResponse.json(agendamento);
  } catch (error) {
    console.error("Erro ao buscar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agendamento" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { clienteId, servicoId, dataHora, observacoes, status } = body;

    const agendamentoExistente = await prisma.agendamento.findUnique({
      where: { id },
      include: { servico: true },
    });

    if (!agendamentoExistente) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 },
      );
    }

    if (agendamentoExistente.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    let duracaoMin = agendamentoExistente.servico.duracaoMin;
    let dataHoraDate = agendamentoExistente.dataHora;

    if (servicoId) {
      const novoServico = await prisma.servico.findUnique({
        where: { id: servicoId },
      });

      if (!novoServico) {
        return NextResponse.json(
          { error: "Serviço não encontrado" },
          { status: 404 },
        );
      }

      duracaoMin = novoServico.duracaoMin;
    }

    if (dataHora) {
      dataHoraDate = new Date(dataHora);
    }

    if (dataHora || servicoId) {
      const { temConflito, conflitoCom } = await validarConflitoAgendamento(
        session.user.id,
        dataHoraDate,
        duracaoMin,
        id,
      );

      if (temConflito) {
        const horaFormatada = conflitoCom?.dataHora.toLocaleTimeString(
          "pt-BR",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        );
        const dataFormatada = conflitoCom?.dataHora.toLocaleDateString("pt-BR");
        return NextResponse.json(
          {
            error: "Conflito de horário",
            mensagem: `Já existe um agendamento para ${dataFormatada}, ${horaFormatada}`,
            conflitoCom,
          },
          { status: 409 },
        );
      }
    }

    const agendamento = await prisma.agendamento.update({
      where: { id },
      data: {
        clienteId: clienteId || agendamentoExistente.clienteId,
        servicoId: servicoId || agendamentoExistente.servicoId,
        dataHora: dataHoraDate,
        observacoes:
          observacoes !== undefined
            ? observacoes
            : agendamentoExistente.observacoes,
        status: status || agendamentoExistente.status,
      },
      include: {
        cliente: true,
        servico: true,
      },
    });

    return NextResponse.json(agendamento);
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar agendamento" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
    });

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 },
      );
    }

    if (agendamento.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    await prisma.agendamento.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Agendamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar agendamento" },
      { status: 500 },
    );
  }
}
