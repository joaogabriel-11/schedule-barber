import { describe, it, expect, vi, beforeEach } from "vitest";
import { calcularRelatorios } from "./calcularRelatorios";

// Mock Prisma client
const { prisma } = vi.hoisted(() => ({
  prisma: {
    agendamento: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    cliente: {
      findUnique: vi.fn(),
    },
    servico: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("./prisma", () => ({
  prisma,
}));

describe("calcularRelatorios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve calcular faturamento total corretamente", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    const agendamentosConcluidos = [
      {
        servico: { preco: 50 },
      },
      {
        servico: { preco: 30 },
      },
      {
        servico: { preco: 20 },
      },
    ];

    prisma.agendamento.findMany.mockResolvedValue(agendamentosConcluidos);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.count.mockResolvedValue(0);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.faturamentoTotal).toBe(100);
    expect(result.quantidadeAtendimentos).toBe(3);
  });

  it("deve contar apenas agendamentos CONCLUIDO para faturamento", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    const agendamentosConcluidos = [
      {
        servico: { preco: 50 },
      },
    ];

    prisma.agendamento.findMany.mockResolvedValue(agendamentosConcluidos);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.count.mockResolvedValue(0);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(prisma.agendamento.findMany).toHaveBeenCalledWith({
      where: {
        usuarioId: "user1",
        status: "CONCLUIDO",
        dataHora: {
          gte: dataInicio,
          lte: expect.any(Date),
        },
      },
      include: {
        servico: true,
        cliente: true,
      },
    });
  });

  it("deve calcular ranking de clientes corretamente", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    const clientesRanking = [
      { clienteId: "c1", _count: { clienteId: 5 } },
      { clienteId: "c2", _count: { clienteId: 3 } },
    ];

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue(clientesRanking);
    prisma.cliente.findUnique
      .mockResolvedValueOnce({ nome: "João Silva" })
      .mockResolvedValueOnce({ nome: "Maria Santos" });
    prisma.agendamento.count.mockResolvedValue(0);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.clientesRanking).toEqual([
      { nome: "João Silva", quantidade: 5 },
      { nome: "Maria Santos", quantidade: 3 },
    ]);
  });

  it("deve calcular ranking de serviços corretamente", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    const servicosRanking = [
      { servicoId: "s1", _count: { servicoId: 10 } },
      { servicoId: "s2", _count: { servicoId: 7 } },
    ];

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue(servicosRanking);
    prisma.servico.findUnique
      .mockResolvedValueOnce({ nome: "Corte de Cabelo" })
      .mockResolvedValueOnce({ nome: "Barba" });
    prisma.agendamento.count.mockResolvedValue(0);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.servicosRanking).toEqual([
      { nome: "Corte de Cabelo", quantidade: 10 },
      { nome: "Barba", quantidade: 7 },
    ]);
  });

  it("deve calcular faturamento mensal dos últimos 6 meses", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const agendamentosUltimos6Meses = [
      {
        dataHora: new Date(currentYear, currentMonth, 15, 10, 0),
        servico: { preco: 50 },
      },
      {
        dataHora: new Date(currentYear, currentMonth, 20, 14, 0),
        servico: { preco: 30 },
      },
    ];

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.count.mockResolvedValue(0);

    // Mock the second call to findMany for monthly revenue
    prisma.agendamento.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(agendamentosUltimos6Meses);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.faturamentoMensal).toHaveLength(6);
    // Check that the last month has the expected revenue
    expect(result.faturamentoMensal[5].valor).toBe(80);
  });

  it("deve calcular taxa de no-show corretamente", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.count
      .mockResolvedValueOnce(2) // CANCELADO + NO_SHOW
      .mockResolvedValueOnce(10); // Total

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.taxaNoShow).toBe(20); // (2/10) * 100 = 20%
  });

  it("deve retornar taxa de no-show 0 quando não há agendamentos", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.count.mockResolvedValue(0);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.taxaNoShow).toBe(0);
  });

  it("deve arredondar taxa de no-show para 2 casas decimais", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.count
      .mockResolvedValueOnce(3) // CANCELADO + NO_SHOW
      .mockResolvedValueOnce(7); // Total

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.taxaNoShow).toBe(42.86); // (3/7) * 100 = 42.857... rounded to 42.86
  });

  it("deve filtrar por usuárioId em todas as queries", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.count.mockResolvedValue(0);

    await calcularRelatorios("user123", dataInicio, dataFim);

    // Verify that usuarioId is used in all queries
    expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: "user123",
        }),
      })
    );
    expect(prisma.agendamento.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: "user123",
        }),
      })
    );
    expect(prisma.agendamento.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: "user123",
        }),
      })
    );
  });

  it("deve retornar 'Desconhecido' para cliente não encontrado", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    const clientesRanking = [{ clienteId: "c1", _count: { clienteId: 5 } }];

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue(clientesRanking);
    prisma.cliente.findUnique.mockResolvedValue(null);
    prisma.agendamento.count.mockResolvedValue(0);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.clientesRanking).toEqual([
      { nome: "Desconhecido", quantidade: 5 },
    ]);
  });

  it("deve retornar 'Desconhecido' para serviço não encontrado", async () => {
    const dataInicio = new Date("2024-01-01T00:00:00");
    const dataFim = new Date("2024-01-31T23:59:59");

    const servicosRanking = [{ servicoId: "s1", _count: { servicoId: 10 } }];

    prisma.agendamento.findMany.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValue([]);
    prisma.agendamento.groupBy.mockResolvedValueOnce([]);
    prisma.agendamento.groupBy.mockResolvedValueOnce(servicosRanking);
    prisma.servico.findUnique.mockResolvedValue(null);
    prisma.agendamento.count.mockResolvedValue(0);

    const result = await calcularRelatorios("user1", dataInicio, dataFim);

    expect(result.servicosRanking).toEqual([
      { nome: "Desconhecido", quantidade: 10 },
    ]);
  });
});
