"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Plus } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
}

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMin: number;
}

interface Agendamento {
  id: string;
  dataHora: string;
  status: string;
  observacoes: string | null;
  cliente: Cliente;
  servico: Servico;
}

export default function AgendaPage() {
  const { data: session } = useSession();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] =
    useState<Agendamento | null>(null);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [configuracao, setConfiguracao] = useState({
    horarioInicio: "08:00",
    horarioFim: "20:00",
  });

  const [formData, setFormData] = useState({
    clienteId: "",
    servicoId: "",
    data: "",
    hora: "",
    observacoes: "",
  });

  const [editFormData, setEditFormData] = useState({
    status: "",
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [agendamentosRes, clientesRes, servicosRes, configRes] =
        await Promise.all([
          fetch("/api/agendamentos"),
          fetch("/api/clientes"),
          fetch("/api/servicos"),
          fetch("/api/configuracoes"),
        ]);

      const [agendamentosData, clientesData, servicosData, configData] =
        await Promise.all([
          agendamentosRes.json(),
          clientesRes.json(),
          servicosRes.json(),
          configRes.json(),
        ]);

      setAgendamentos(agendamentosData);
      setClientes(clientesData);
      setServicos(servicosData);
      if (configData) {
        setConfiguracao({
          horarioInicio: configData.horarioInicio || "08:00",
          horarioFim: configData.horarioFim || "20:00",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = parseInt(configuracao.horarioInicio.split(":")[0]);
    const endHour = parseInt(configuracao.horarioFim.split(":")[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeStr);
      }
    }
    slots.push(configuracao.horarioFim);
    return slots;
  };

  const handleCreateAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.data || !formData.hora) {
      setError("Selecione data e horário");
      return;
    }

    const dataHora = new Date(`${formData.data}T${formData.hora}`);

    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: formData.clienteId,
          servicoId: formData.servicoId,
          dataHora: dataHora.toISOString(),
          observacoes: formData.observacoes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.mensagem || "Conflito de horário");
        } else {
          setError(data.error || "Erro ao criar agendamento");
        }
        return;
      }

      setShowModal(false);
      setFormData({
        clienteId: "",
        servicoId: "",
        data: "",
        hora: "",
        observacoes: "",
      });
      fetchData();
    } catch (error) {
      setError("Erro ao conectar com o servidor");
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/agendamentos/${selectedAgendamento?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editFormData.status }),
      });

      if (!res.ok) {
        setError("Erro ao atualizar agendamento");
        return;
      }

      setShowEditModal(false);
      setSelectedAgendamento(null);
      setEditFormData({ status: "" });
      fetchData();
    } catch (error) {
      setError("Erro ao conectar com o servidor");
    }
  };

  const handleCancelAgendamento = async () => {
    if (!selectedAgendamento) return;

    try {
      const res = await fetch(`/api/agendamentos/${selectedAgendamento.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Erro ao cancelar agendamento");
        return;
      }

      setShowEditModal(false);
      setSelectedAgendamento(null);
      fetchData();
    } catch (error) {
      setError("Erro ao conectar com o servidor");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AGENDADO":
        return "bg-blue-100 text-blue-800";
      case "CONFIRMADO":
        return "bg-green-100 text-green-800";
      case "CONCLUIDO":
        return "bg-purple-100 text-purple-800";
      case "CANCELADO":
        return "bg-red-100 text-red-800";
      case "NO_SHOW":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEventBackgroundColor = (status: string) => {
    switch (status) {
      case "AGENDADO":
        return "#3B82F6";
      case "CONFIRMADO":
        return "#10B981";
      case "CONCLUIDO":
        return "#8B5CF6";
      case "CANCELADO":
        return "#EF4444";
      case "NO_SHOW":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AGENDADO":
        return "Agendado";
      case "CONFIRMADO":
        return "Confirmado";
      case "CONCLUIDO":
        return "Concluído";
      case "CANCELADO":
        return "Cancelado";
      case "NO_SHOW":
        return "Não Compareceu";
      default:
        return status;
    }
  };

  const events = agendamentos.map((a) => ({
    id: a.id,
    title: `${a.cliente.nome} - ${a.servico.nome} - ${getStatusLabel(a.status)}`,
    start: a.dataHora,
    end: new Date(
      new Date(a.dataHora).getTime() + a.servico.duracaoMin * 60000,
    ).toISOString(),
    backgroundColor: getEventBackgroundColor(a.status),
    extendedProps: { agendamento: a },
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie seus agendamentos
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Novo Agendamento
        </button>
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {agendamentos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum agendamento encontrado
            </div>
          ) : (
            agendamentos
              .sort(
                (a, b) =>
                  new Date(a.dataHora).getTime() -
                  new Date(b.dataHora).getTime(),
              )
              .map((agendamento) => (
                <div
                  key={agendamento.id}
                  onClick={() => {
                    setSelectedAgendamento(agendamento);
                    setEditFormData({ status: agendamento.status });
                    setShowEditModal(true);
                  }}
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-colors border-l-4"
                  style={{
                    borderLeftColor: getEventBackgroundColor(
                      agendamento.status,
                    ),
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {agendamento.cliente.nome}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {agendamento.servico.nome}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ml-2 whitespace-nowrap ${getStatusColor(agendamento.status)}`}
                    >
                      {getStatusLabel(agendamento.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(agendamento.dataHora).toLocaleString("pt-BR")}
                  </p>
                  {agendamento.observacoes && (
                    <p className="text-sm text-gray-600 mt-2 truncate">
                      {agendamento.observacoes}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {agendamentos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum agendamento encontrado
            </div>
          ) : (
            <FullCalendar
              allDaySlot={false}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              editable={false}
              selectable={true}
              select={(info) => {
                const dateStr = info.startStr.split("T")[0];
                const timeStr =
                  info.startStr.split("T")[1]?.substring(0, 5) || "09:00";
                setFormData({
                  ...formData,
                  data: dateStr,
                  hora: timeStr,
                });
                setShowModal(true);
              }}
              eventClick={(info) => {
                const agendamento = info.event.extendedProps
                  .agendamento as Agendamento;
                setSelectedAgendamento(agendamento);
                setEditFormData({ status: agendamento.status });
                setShowEditModal(true);
              }}
              height="auto"
              slotMinTime={configuracao.horarioInicio}
              slotMaxTime="24:00:00"
              locale="pt-br"
              buttonText={{
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
              }}
              allDayText="Dia todo"
              eventBorderColor="transparent"
            />
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Novo Agendamento
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateAgendamento}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <select
                    required
                    value={formData.clienteId}
                    onChange={(e) =>
                      setFormData({ ...formData, clienteId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} - {cliente.telefone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serviço
                  </label>
                  <select
                    required
                    value={formData.servicoId}
                    onChange={(e) =>
                      setFormData({ ...formData, servicoId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Selecione um serviço</option>
                    {servicos.map((servico) => (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome} - R$ {servico.preco} (
                        {servico.duracaoMin} min)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) =>
                        setFormData({ ...formData, data: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horário
                    </label>
                    <select
                      required
                      value={formData.hora}
                      onChange={(e) =>
                        setFormData({ ...formData, hora: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Selecione</option>
                      {generateTimeSlots().map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError("");
                    setFormData({
                      clienteId: "",
                      servicoId: "",
                      data: "",
                      hora: "",
                      observacoes: "",
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedAgendamento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Editar Agendamento
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Cliente:</strong> {selectedAgendamento.cliente.nome}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Serviço:</strong> {selectedAgendamento.servico.nome}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Data/Hora:</strong>{" "}
                {new Date(selectedAgendamento.dataHora).toLocaleString("pt-BR")}
              </p>
            </div>
            <form onSubmit={handleUpdateStatus}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    required
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="AGENDADO">Agendado</option>
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="NO_SHOW">Não Compareceu</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCancelAgendamento}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Cancelar Agendamento
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedAgendamento(null);
                      setError("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
