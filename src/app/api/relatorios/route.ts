import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");

  try {
    const dataInicio = inicio ? new Date(inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dataFim = fim ? new Date(fim) : new Date();

    // Set end of day for dataFim
    dataFim.setHours(23, 59, 59, 999);

    // Faturamento total (apenas CONCLUIDO)
    const agendamentosConcluidos = await prisma.agendamento.findMany({
      where: {
        usuarioId: session.user.id,
        status: "CONCLUIDO",
        dataHora: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      include: {
        servico: true,
        cliente: true
      }
    });

    const faturamentoTotal = agendamentosConcluidos.reduce(
      (sum, a) => sum + a.servico.preco,
      0
    );

    // Quantidade de atendimentos
    const quantidadeAtendimentos = agendamentosConcluidos.length;

    // Top 5 clientes (mais agendamentos concluídos)
    const clientesRanking = await prisma.agendamento.groupBy({
      by: ["clienteId"],
      where: {
        usuarioId: session.user.id,
        status: "CONCLUIDO",
        dataHora: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      _count: {
        clienteId: true
      },
      orderBy: {
        _count: {
          clienteId: "desc"
        }
      },
      take: 5
    });

    const clientesComNomes = await Promise.all(
      clientesRanking.map(async (c) => {
        const cliente = await prisma.cliente.findUnique({
          where: { id: c.clienteId }
        });
        return {
          nome: cliente?.nome || "Desconhecido",
          quantidade: c._count.clienteId
        };
      })
    );

    // Serviços mais populares
    const servicosRanking = await prisma.agendamento.groupBy({
      by: ["servicoId"],
      where: {
        usuarioId: session.user.id,
        status: "CONCLUIDO",
        dataHora: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      _count: {
        servicoId: true
      },
      orderBy: {
        _count: {
          servicoId: "desc"
        }
      },
      take: 5
    });

    const servicosComNomes = await Promise.all(
      servicosRanking.map(async (s) => {
        const servico = await prisma.servico.findUnique({
          where: { id: s.servicoId }
        });
        return {
          nome: servico?.nome || "Desconhecido",
          quantidade: s._count.servicoId
        };
      })
    );

    // Faturamento mensal (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const agendamentosUltimos6Meses = await prisma.agendamento.findMany({
      where: {
        usuarioId: session.user.id,
        status: "CONCLUIDO",
        dataHora: {
          gte: seisMesesAtras
        }
      },
      include: {
        servico: true
      }
    });

    const faturamentoMensal: { mes: string; valor: number }[] = [];
    const meses = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    for (let i = 5; i >= 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      const mes = data.getMonth();
      const ano = data.getFullYear();

      const valor = agendamentosUltimos6Meses
        .filter(a => {
          const dataAgendamento = new Date(a.dataHora);
          return dataAgendamento.getMonth() === mes && dataAgendamento.getFullYear() === ano;
        })
        .reduce((sum, a) => sum + a.servico.preco, 0);

      faturamentoMensal.push({
        mes: meses[mes],
        valor
      });
    }

    // Taxa de no-show/cancelamento
    const agendamentosCanceladosNoShow = await prisma.agendamento.count({
      where: {
        usuarioId: session.user.id,
        status: {
          in: ["CANCELADO", "NO_SHOW"]
        },
        dataHora: {
          gte: dataInicio,
          lte: dataFim
        }
      }
    });

    const totalAgendamentosPeriodo = await prisma.agendamento.count({
      where: {
        usuarioId: session.user.id,
        dataHora: {
          gte: dataInicio,
          lte: dataFim
        }
      }
    });

    const taxaNoShow = totalAgendamentosPeriodo > 0
      ? (agendamentosCanceladosNoShow / totalAgendamentosPeriodo) * 100
      : 0;

    return NextResponse.json({
      faturamentoTotal,
      quantidadeAtendimentos,
      clientesRanking: clientesComNomes,
      servicosRanking: servicosComNomes,
      faturamentoMensal,
      taxaNoShow: Math.round(taxaNoShow * 100) / 100
    });
  } catch (error) {
    console.error("Erro ao gerar relatórios:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatórios" },
      { status: 500 }
    );
  }
}
