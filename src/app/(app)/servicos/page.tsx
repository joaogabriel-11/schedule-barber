"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMin: number;
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco: "",
    duracaoMin: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchServicos = async () => {
    try {
      const response = await fetch("/api/servicos");
      if (response.ok) {
        const data = await response.json();
        setServicos(data);
      }
    } catch (err) {
      console.error("Erro ao buscar serviços:", err);
    }
  };

  useEffect(() => {
    fetchServicos();
  }, []);

  const handleCreate = () => {
    setEditingServico(null);
    setFormData({ nome: "", descricao: "", preco: "", duracaoMin: "" });
    setShowModal(true);
  };

  const handleEdit = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || "",
      preco: servico.preco.toString(),
      duracaoMin: servico.duracaoMin.toString()
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = editingServico
        ? `/api/servicos/${editingServico.id}`
        : "/api/servicos";
      const method = editingServico ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Erro ao salvar serviço");
        return;
      }

      setShowModal(false);
      fetchServicos();
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja desativar este serviço?")) {
      return;
    }

    try {
      const response = await fetch(`/api/servicos/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchServicos();
      }
    } catch (err) {
      console.error("Erro ao deletar serviço:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Serviços</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie seus serviços</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Novo Serviço
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duração
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {servicos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Nenhum serviço encontrado
                  </td>
                </tr>
              ) : (
                servicos.map((servico) => (
                  <tr key={servico.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {servico.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {servico.descricao || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {servico.preco.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {servico.duracaoMin} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(servico)}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(servico.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Desativar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingServico ? "Editar Serviço" : "Novo Serviço"}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.preco}
                    onChange={(e) =>
                      setFormData({ ...formData, preco: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração (minutos) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.duracaoMin}
                    onChange={(e) =>
                      setFormData({ ...formData, duracaoMin: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
