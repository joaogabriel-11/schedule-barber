"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Clock, User, Mail } from "lucide-react";

export default function ConfiguracoesPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [error, setError] = useState("");
  const [accountError, setAccountError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");

  const [formData, setFormData] = useState({
    horarioInicio: "08:00",
    horarioFim: "20:00"
  });

  const [accountData, setAccountData] = useState({
    nome: "",
    email: ""
  });

  useEffect(() => {
    if (session) {
      fetchConfiguracao();
      setAccountData({
        nome: session.user.name || "",
        email: session.user.email || ""
      });
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

      // Recarrega as configurações para garantir que os dados estejam atualizados
      await fetchConfiguracao();

      setSuccess("Configurações salvas com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAccount(true);
    setAccountError("");
    setAccountSuccess("");

    try {
      const emailAtual = session?.user?.email || "";
      const novoEmail = accountData.email.trim().toLowerCase();
      const emailAlterado = novoEmail !== emailAtual.toLowerCase();

      if (emailAlterado) {
        if (accountData.nome !== session?.user?.name) {
          const nomeResponse = await fetch("/api/usuario", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: accountData.nome })
          });

          if (!nomeResponse.ok) {
            const data = await nomeResponse.json();
            setAccountError(data.error || "Erro ao atualizar nome");
            return;
          }

          const updatedUser = await nomeResponse.json();

          await update({
            ...session,
            user: {
              ...session?.user,
              name: updatedUser.nome,
              email: updatedUser.email
            }
          });
        }

        const emailResponse = await fetch("/api/usuario/email/iniciar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: novoEmail })
        });

        if (!emailResponse.ok) {
          const data = await emailResponse.json();
          setAccountError(data.error || "Erro ao enviar codigo de verificacao");
          return;
        }

        setPendingEmail(novoEmail);
        setEmailCode("");
        setAccountSuccess("Codigo de verificacao enviado para o novo email.");
        return;
      }

      const response = await fetch("/api/usuario", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData)
      });

      if (!response.ok) {
        const data = await response.json();
        setAccountError(data.error || "Erro ao atualizar dados da conta");
        return;
      }

      const updatedUser = await response.json();

      // Atualiza a sessão com os novos dados
      await update({
        ...session,
        user: {
          ...session?.user,
          name: updatedUser.nome,
          email: updatedUser.email
        }
      });

      // Atualiza o estado local com os novos dados
      setAccountData({
        nome: updatedUser.nome,
        email: updatedUser.email
      });

      setAccountSuccess("Dados da conta atualizados com sucesso!");
      setTimeout(() => setAccountSuccess(""), 3000);
    } catch (err) {
      setAccountError("Erro ao conectar com o servidor");
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleConfirmEmail = async () => {
    if (!pendingEmail || !emailCode) return;

    setLoadingAccount(true);
    setAccountError("");
    setAccountSuccess("");

    try {
      const response = await fetch("/api/usuario/email/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          codigo: emailCode
        })
      });

      if (!response.ok) {
        const data = await response.json();
        setAccountError(data.error || "Erro ao confirmar email");
        return;
      }

      const updatedUser = await response.json();

      await update({
        ...session,
        user: {
          ...session?.user,
          name: updatedUser.nome,
          email: updatedUser.email
        }
      });

      setAccountData({
        nome: updatedUser.nome,
        email: updatedUser.email
      });
      setPendingEmail("");
      setEmailCode("");
      setAccountSuccess("Email atualizado com sucesso!");
      setTimeout(() => setAccountSuccess(""), 3000);
    } catch (err) {
      setAccountError("Erro ao conectar com o servidor");
    } finally {
      setLoadingAccount(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie suas configurações e dados da conta</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Account Data Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <User size={20} className="mr-2 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">Dados da Conta</h2>
          </div>

          {accountError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {accountError}
            </div>
          )}
          {accountSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {accountSuccess}
            </div>
          )}

          <form onSubmit={handleAccountSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={accountData.nome}
                  onChange={(e) => setAccountData({ ...accountData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={accountData.email}
                  onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              {pendingEmail && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800 mb-3">
                    Digite o codigo enviado para <strong>{pendingEmail}</strong>{" "}
                    para concluir a alteracao do email.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailCode}
                      onChange={(e) =>
                        setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmEmail}
                      disabled={loadingAccount || emailCode.length !== 6}
                      className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loadingAccount}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {loadingAccount ? "Salvando..." : "Salvar Dados da Conta"}
              </button>
            </div>
          </form>
        </div>

        {/* Business Hours Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
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
    </div>
  );
}
