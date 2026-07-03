"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RelatorioData {
  faturamentoTotal: number;
  quantidadeAtendimentos: number;
  clientesRanking: { nome: string; quantidade: number }[];
  servicosRanking: { nome: string; quantidade: number }[];
  faturamentoMensal: { mes: string; valor: number }[];
  taxaNoShow: number;
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RelatorioData | null>(null);
  const [error, setError] = useState("");

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    // Set default dates: current month
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    setDataInicio(primeiroDiaMes.toISOString().split("T")[0]);
    setDataFim(ultimoDiaMes.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      fetchRelatorio();
    }
  }, [dataInicio, dataFim]);

  const fetchRelatorio = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/relatorios?inicio=${dataInicio}&fim=${dataFim}`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar relatórios");
      }

      const relatorioData = await response.json();
      setData(relatorioData);
    } catch (err) {
      setError("Erro ao carregar relatórios");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setPeriodo = (periodo: string) => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date = new Date(hoje);
    fim.setHours(23, 59, 59, 999);

    switch (periodo) {
      case "este_mes":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case "mes_passado":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case "ultimos_30_dias":
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 30);
        break;
      case "hoje":
        inicio = new Date(hoje);
        inicio.setHours(0, 0, 0, 0);
        fim = new Date(hoje);
        fim.setHours(23, 59, 59, 999);
        break;
      default:
        return;
    }

    setDataInicio(inicio.toISOString().split("T")[0]);
    setDataFim(fim.toISOString().split("T")[0]);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Relatórios</h1>

      {/* Filtros de período */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filtro de Período</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriodo("hoje")}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo("este_mes")}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodo("mes_passado")}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Mês Passado
          </button>
          <button
            onClick={() => setPeriodo("ultimos_30_dias")}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Últimos 30 Dias
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Cards de métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Faturamento Total</div>
              <div className="text-3xl font-bold text-green-600">
                {formatarMoeda(data.faturamentoTotal)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Atendimentos</div>
              <div className="text-3xl font-bold text-indigo-600">
                {data.quantidadeAtendimentos}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Taxa de No-Show/Cancelamento</div>
              <div className={`text-3xl font-bold ${data.taxaNoShow > 20 ? "text-red-600" : "text-green-600"}`}>
                {data.taxaNoShow.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Gráfico de faturamento mensal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Faturamento Mensal (Últimos 6 Meses)</h2>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.faturamentoMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [formatarMoeda(value), "Faturamento"]}
                  />
                  <Bar dataKey="valor" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Clientes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Top 5 Clientes</h2>
              {data.clientesRanking.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum cliente encontrado</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Atendimentos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.clientesRanking.map((cliente, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{cliente.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {cliente.quantidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Serviços Mais Populares */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Serviços Mais Populares</h2>
              {data.servicosRanking.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum serviço encontrado</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Serviço
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Quantidade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.servicosRanking.map((servico, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{servico.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {servico.quantidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
