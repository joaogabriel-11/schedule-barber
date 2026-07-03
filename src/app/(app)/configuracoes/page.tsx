"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Clock } from "lucide-react";

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    horarioInicio: "08:00",
    horarioFim: "20:00"
  });

  useEffect(() => {
    if (session) {
      fetchConfiguracao();
    }
  }, [session]);

  const fetchConfiguracao = async () => {
    try {
      const response = await fetch("/api/configuracoes");
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setFormData({
            horarioInicio: data.horarioInicio || "08:00",
            horarioFim: data.horarioFim || "20:00"
          });
        }
      }
    } catch (err) {
      console.error("Erro ao buscar configurações:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Erro ao salvar configurações");
        return;
      }

      setSuccess("Configurações salvas com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Configure o horário de funcionamento da barbearia</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <div className="flex items-center mb-4">
                <Clock size={20} className="mr-2 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">Horário de Funcionamento</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.horarioInicio}
                    onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horário de Término
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.horarioFim}
                    onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Esses horários serão usados para gerar os slots disponíveis ao criar agendamentos.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
