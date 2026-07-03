"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface Agendamento {
  id: string;
  dataHora: Date;
  observacoes: string | null;
  status: string;
  cliente: {
    id: string;
    nome: string;
    telefone: string;
  };
  servico: {
    id: string;
    nome: string;
    duracaoMin: number;
    preco: number;
  };
}

export default function NotificacoesPage() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchNotificacoes = async () => {
    try {
      const res = await fetch("/api/notificacoes");
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificacoes();
  }, []);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (res.ok) {
        // Remove the updated appointment from the list
        setAgendamentos((prev) => prev.filter((ag) => ag.id !== id));
        // Refresh the notifications count in the sidebar by triggering a custom event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("notifications-updated"));
        }, 100);
      } else {
        alert("Erro ao atualizar status");
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatarDataHora = (dataHora: Date) => {
    const data = new Date(dataHora);
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularTempoPassado = (dataHora: Date, duracaoMin: number) => {
    const inicio = new Date(dataHora);
    const fim = new Date(inicio.getTime() + duracaoMin * 60000);
    const agora = new Date();
    const diffMs = agora.getTime() - fim.getTime();
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffDias > 0) {
      return `${diffDias} dia${diffDias > 1 ? "s" : ""} atrás`;
    } else if (diffHoras > 0) {
      return `${diffHoras} hora${diffHoras > 1 ? "s" : ""} atrás`;
    } else {
      const diffMin = Math.floor(diffMs / 60000);
      return `${diffMin} minuto${diffMin > 1 ? "s" : ""} atrás`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="text-amber-600" size={28} />
            Notificações
          </h1>
          <p className="text-gray-600 mt-2">
            Agendamentos que precisam de atualização de status
          </p>
        </div>

        {agendamentos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Tudo em dia!
            </h2>
            <p className="text-gray-600">
              Não há agendamentos pendentes de atualização.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {agendamentos.map((agendamento) => (
              <div
                key={agendamento.id}
                className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-amber-500"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-100 p-3 rounded-full">
                        <AlertCircle className="text-amber-600" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {agendamento.cliente.nome}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          {agendamento.servico.nome} - R${" "}
                          {agendamento.servico.preco.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                          <Clock size={16} />
                          <span>{formatarDataHora(agendamento.dataHora)}</span>
                          <span className="text-amber-600 font-medium">
                            • {calcularTempoPassado(
                              agendamento.dataHora,
                              agendamento.servico.duracaoMin
                            )}
                          </span>
                        </div>
                        {agendamento.observacoes && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            "{agendamento.observacoes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => atualizarStatus(agendamento.id, "CONCLUIDO")}
                      disabled={updatingId === agendamento.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircle size={18} />
                      Concluído
                    </button>
                    <button
                      onClick={() => atualizarStatus(agendamento.id, "NO_SHOW")}
                      disabled={updatingId === agendamento.id}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Clock size={18} />
                      Não compareceu
                    </button>
                    <button
                      onClick={() => atualizarStatus(agendamento.id, "CANCELADO")}
                      disabled={updatingId === agendamento.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle size={18} />
                      Cancelado
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
