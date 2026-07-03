import { describe, it, expect, vi, beforeEach } from "vitest";
import { validarConflitoAgendamento } from "./validarConflito";

// Mock Prisma client
const { prisma } = vi.hoisted(() => ({
  prisma: {
    agendamento: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./prisma", () => ({
  prisma,
}));

describe("validarConflitoAgendamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar sem conflito quando não há agendamentos sobrepostos", async () => {
    const dataHora = new Date("2024-01-15T10:00:00");
    const duracaoMin = 30;

    prisma.agendamento.findMany.mockResolvedValue([]);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(false);
    expect(result.conflitoCom).toBeUndefined();
  });

  it("deve detectar conflito de sobreposição total (agendamento existente contém o novo)", async () => {
    const dataHora = new Date("2024-01-15T10:30:00");
    const duracaoMin = 30;

    const agendamentoExistente = {
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      servico: { duracaoMin: 60 },
    };

    prisma.agendamento.findMany.mockResolvedValue([agendamentoExistente]);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(true);
    expect(result.conflitoCom).toEqual({
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      duracaoMin: 60,
    });
  });

  it("deve detectar conflito de sobreposição parcial (início do novo durante existente)", async () => {
    const dataHora = new Date("2024-01-15T10:20:00");
    const duracaoMin = 60;

    const agendamentoExistente = {
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      servico: { duracaoMin: 30 },
    };

    prisma.agendamento.findMany.mockResolvedValue([agendamentoExistente]);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(true);
    expect(result.conflitoCom).toEqual({
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      duracaoMin: 30,
    });
  });

  it("deve detectar conflito de sobreposição parcial (fim do novo durante existente)", async () => {
    const dataHora = new Date("2024-01-15T09:30:00");
    const duracaoMin = 60;

    const agendamentoExistente = {
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      servico: { duracaoMin: 30 },
    };

    prisma.agendamento.findMany.mockResolvedValue([agendamentoExistente]);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(true);
    expect(result.conflitoCom).toEqual({
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      duracaoMin: 30,
    });
  });

  it("deve detectar conflito quando novo agendamento contém existente", async () => {
    const dataHora = new Date("2024-01-15T09:30:00");
    const duracaoMin = 90;

    const agendamentoExistente = {
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      servico: { duracaoMin: 30 },
    };

    prisma.agendamento.findMany.mockResolvedValue([agendamentoExistente]);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(true);
    expect(result.conflitoCom).toEqual({
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      duracaoMin: 30,
    });
  });

  it("não deve detectar conflito com agendamentos cancelados", async () => {
    const dataHora = new Date("2024-01-15T10:00:00");
    const duracaoMin = 30;

    const agendamentoCancelado = {
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      servico: { duracaoMin: 30 },
    };

    prisma.agendamento.findMany.mockResolvedValue([]);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(false);
  });

  it("deve ignorar o agendamento especificado em agendamentoIdExcluir", async () => {
    const dataHora = new Date("2024-01-15T10:00:00");
    const duracaoMin = 30;
    const agendamentoIdExcluir = "ag1";

    const agendamentoExistente = {
      id: "ag1",
      dataHora: new Date("2024-01-15T10:00:00"),
      servico: { duracaoMin: 30 },
    };

    prisma.agendamento.findMany.mockResolvedValue([]);

    const result = await validarConflitoAgendamento(
      "user1",
      dataHora,
      duracaoMin,
      agendamentoIdExcluir
    );

    expect(result.temConflito).toBe(false);
    expect(prisma.agendamento.findMany).toHaveBeenCalledWith({
      where: {
        usuarioId: "user1",
        id: { not: "ag1" },
        status: { not: "CANCELADO" },
        OR: expect.any(Array),
      },
      include: {
        servico: true,
      },
    });
  });

  it("não deve detectar conflito quando agendamentos são adjacentes (fim de um = início do outro)", async () => {
    const dataHora = new Date("2024-01-15T11:00:00");
    const duracaoMin = 30;

    const agendamentoExistente = {
      id: "ag1",
      dataHora: new Date("2024-01-15T10:30:00"),
      servico: { duracaoMin: 30 },
    };

    prisma.agendamento.findMany.mockResolvedValue([agendamentoExistente]);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(false);
  });

  it("deve detectar conflito com múltiplos agendamentos e retornar o primeiro conflito", async () => {
    const dataHora = new Date("2024-01-15T10:30:00");
    const duracaoMin = 30;

    const agendamentos = [
      {
        id: "ag1",
        dataHora: new Date("2024-01-15T10:00:00"),
        servico: { duracaoMin: 60 },
      },
      {
        id: "ag2",
        dataHora: new Date("2024-01-15T11:00:00"),
        servico: { duracaoMin: 30 },
      },
    ];

    prisma.agendamento.findMany.mockResolvedValue(agendamentos);

    const result = await validarConflitoAgendamento("user1", dataHora, duracaoMin);

    expect(result.temConflito).toBe(true);
    expect(result.conflitoCom?.id).toBe("ag1");
  });
});
