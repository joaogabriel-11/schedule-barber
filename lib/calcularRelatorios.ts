import { prisma } from "./prisma";

interface AgendamentoComDetalhes {
  dataHora: Date;
  servico: {
    preco: number;
    duracaoMin: number;
  };
  cliente: {
    nome: string;
  };
}

interface RelatorioData {
  faturamentoTotal: number;
  quantidadeAtendimentos: number;
  clientesRanking: { nome: string; quantidade: number }[];
  servicosRanking: { nome: string; quantidade: number }[];
  faturamentoMensal: { mes: string; valor: number }[];
  taxaNoShow: number;
}

export async function calcularRelatorios(
  usuarioId: string,
  dataInicio: Date,
  dataFim: Date
): Promise<RelatorioData> {
  // Set end of day for dataFim
  dataFim.setHours(23, 59, 59, 999);

  // Faturamento total (apenas CONCLUIDO)
  const agendamentosConcluidos = await prisma.agendamento.findMany({
    where: {
      usuarioId,
      status: "CONCLUIDO",
      dataHora: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
    include: {
      servico: true,
      cliente: true,
    },
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
      usuarioId,
      status: "CONCLUIDO",
      dataHora: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
    _count: {
      clienteId: true,
    },
    orderBy: {
      _count: {
        clienteId: "desc",
      },
    },
    take: 5,
  });

  const clientesComNomes = await Promise.all(
    clientesRanking.map(async (c) => {
      const cliente = await prisma.cliente.findUnique({
        where: { id: c.clienteId },
      });
      return {
        nome: cliente?.nome || "Desconhecido",
        quantidade: c._count.clienteId,
      };
    })
  );

  // Serviços mais populares
  const servicosRanking = await prisma.agendamento.groupBy({
    by: ["servicoId"],
    where: {
      usuarioId,
      status: "CONCLUIDO",
      dataHora: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
    _count: {
      servicoId: true,
    },
    orderBy: {
      _count: {
        servicoId: "desc",
      },
    },
    take: 5,
  });

  const servicosComNomes = await Promise.all(
    servicosRanking.map(async (s) => {
      const servico = await prisma.servico.findUnique({
        where: { id: s.servicoId },
      });
      return {
        nome: servico?.nome || "Desconhecido",
        quantidade: s._count.servicoId,
      };
    })
  );

  // Faturamento mensal (últimos 6 meses)
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

  const agendamentosUltimos6Meses = await prisma.agendamento.findMany({
    where: {
      usuarioId,
      status: "CONCLUIDO",
      dataHora: {
        gte: seisMesesAtras,
      },
    },
    include: {
      servico: true,
    },
  });

  const faturamentoMensal: { mes: string; valor: number }[] = [];
  const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  for (let i = 5; i >= 0; i--) {
    const data = new Date();
    data.setMonth(data.getMonth() - i);
    const mes = data.getMonth();
    const ano = data.getFullYear();

    const valor = agendamentosUltimos6Meses
      .filter((a) => {
        const dataAgendamento = new Date(a.dataHora);
        return (
          dataAgendamento.getMonth() === mes &&
          dataAgendamento.getFullYear() === ano
        );
      })
      .reduce((sum, a) => sum + a.servico.preco, 0);

    faturamentoMensal.push({
      mes: meses[mes],
      valor,
    });
  }

  // Taxa de no-show/cancelamento
  const agendamentosCanceladosNoShow = await prisma.agendamento.count({
    where: {
      usuarioId,
      status: {
        in: ["CANCELADO", "NO_SHOW"],
      },
      dataHora: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
  });

  const totalAgendamentosPeriodo = await prisma.agendamento.count({
    where: {
      usuarioId,
      dataHora: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
  });

  const taxaNoShow =
    totalAgendamentosPeriodo > 0
      ? (agendamentosCanceladosNoShow / totalAgendamentosPeriodo) * 100
      : 0;

  return {
    faturamentoTotal,
    quantidadeAtendimentos,
    clientesRanking: clientesComNomes,
    servicosRanking: servicosComNomes,
    faturamentoMensal,
    taxaNoShow: Math.round(taxaNoShow * 100) / 100,
  };
}
