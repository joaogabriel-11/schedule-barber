import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";
import { validarConflitoAgendamento } from "../../../../lib/validarConflito";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const data = searchParams.get("data");
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    const where: any = {
      usuarioId: session.user.id
    };

    if (data) {
      const dataInicio = new Date(data);
      const dataFim = new Date(data);
      dataFim.setDate(dataFim.getDate() + 1);
      where.dataHora = {
        gte: dataInicio,
        lt: dataFim
      };
    } else if (inicio && fim) {
      where.dataHora = {
        gte: new Date(inicio),
        lte: new Date(fim)
      };
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        cliente: true,
        servico: true
      },
      orderBy: { dataHora: "asc" }
    });

    return NextResponse.json(agendamentos);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agendamentos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clienteId, servicoId, dataHora, observacoes } = body;

    if (!clienteId || !servicoId || !dataHora) {
      return NextResponse.json(
        { error: "Cliente, serviço e data/hora são obrigatórios" },
        { status: 400 }
      );
    }

    const servico = await prisma.servico.findUnique({
      where: { id: servicoId }
    });

    if (!servico) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    const dataHoraDate = new Date(dataHora);

    const { temConflito, conflitoCom } = await validarConflitoAgendamento(
      session.user.id,
      dataHoraDate,
      servico.duracaoMin
    );

    if (temConflito) {
      const horaFormatada = conflitoCom?.dataHora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });
      const dataFormatada = conflitoCom?.dataHora.toLocaleDateString("pt-BR");
      return NextResponse.json(
        {
          error: "Conflito de horário",
          mensagem: `Já existe um agendamento para ${dataFormatada}, ${horaFormatada}`,
          conflitoCom
        },
        { status: 409 }
      );
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        usuarioId: session.user.id,
        clienteId,
        servicoId,
        dataHora: dataHoraDate,
        observacoes: observacoes || null,
        status: "AGENDADO"
      },
      include: {
        cliente: true,
        servico: true
      }
    });

    return NextResponse.json(agendamento, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao criar agendamento" },
      { status: 500 }
    );
  }
}
