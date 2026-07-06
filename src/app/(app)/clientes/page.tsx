"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
}

function formatarTelefoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function telefoneValido(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

function emailValido(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchClientes = async (searchTerm = "") => {
    try {
      const url = searchTerm
        ? `/api/clientes?search=${encodeURIComponent(searchTerm)}`
        : "/api/clientes";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setClientes(data);
      }
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchClientes(search);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleCreate = () => {
    setEditingCliente(null);
    setFormData({ nome: "", telefone: "", email: "" });
    setShowModal(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!telefoneValido(formData.telefone)) {
      setError("Informe um telefone com DDD e 10 ou 11 digitos");
      setLoading(false);
      return;
    }

    if (!emailValido(formData.email)) {
      setError("Informe um email valido");
      setLoading(false);
      return;
    }

    try {
      const url = editingCliente
        ? `/api/clientes/${editingCliente.id}`
        : "/api/clientes";
      const method = editingCliente ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Erro ao salvar cliente");
        return;
      }

      setShowModal(false);
      fetchClientes(search);
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja desativar este cliente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchClientes(search);
      }
    } catch (err) {
      console.error("Erro ao deletar cliente:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie seus clientes</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Novo Cliente
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
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
                  Telefone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cliente.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cliente.telefone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cliente.email || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(cliente)}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
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
              {editingCliente ? "Editar Cliente" : "Novo Cliente"}
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
                    Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telefone: formatarTelefoneInput(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
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
