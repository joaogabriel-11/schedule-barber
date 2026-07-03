"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Calendar, Users, Scissors, BarChart3, Settings, LogOut, Bell } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchNotificationCount = async () => {
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNotificationCount(data.length);
      }
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotificationCount();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000);

      // Listen for custom event when notifications are updated
      const handleNotificationsUpdate = () => {
        fetchNotificationCount();
      };
      window.addEventListener("notifications-updated", handleNotificationsUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener("notifications-updated", handleNotificationsUpdate);
      };
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navItems = [
    { path: "/", label: "Agenda", icon: Calendar },
    { path: "/clientes", label: "Clientes", icon: Users },
    { path: "/servicos", label: "Serviços", icon: Scissors },
    { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
    { path: "/notificacoes", label: "Notificações", icon: Bell, showBadge: true },
    { path: "/configuracoes", label: "Configurações", icon: Settings }
  ];

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
        <main className="flex-1">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`relative flex flex-col items-center px-3 py-2 rounded-lg ${
                    pathname === item.path
                      ? "text-amber-600 bg-amber-50"
                      : "text-gray-600"
                  }`}
                >
                  <Icon size={20} />
                  {item.showBadge && notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex flex-col items-center px-3 py-2 rounded-lg text-gray-600"
            >
              <LogOut size={20} />
              <span className="text-xs mt-1">Sair</span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Barbearia</h1>
          <p className="text-sm text-gray-500 mt-1">{session.user.name}</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => router.push(item.path)}
                    className={`relative w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                      pathname === item.path
                        ? "bg-amber-50 text-amber-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={20} className="mr-3" />
                    <span className="font-medium">{item.label}</span>
                    {item.showBadge && notificationCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {notificationCount > 9 ? "9+" : notificationCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}
