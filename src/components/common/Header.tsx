import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  Plus,
  Shield,
  ChevronDown,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Menu,
  IdCard,
  Lock,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCompany } from '../../context/CompanyContext.tsx';
import { api } from '../../services/api.ts';
import { NotificationItem } from '../../types/index.ts';
import { CompanyLogo } from './CompanyLogo.tsx';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenQuickAction?: (action: string) => void;
  onToggleSidebarMobile?: () => void;
  onToggleMobileSidebar?: () => void;
  onNavigate?: (module: any, subModule?: string) => void;
  onNavigateToModule?: (module: any, subModule?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenQuickAction,
  onToggleSidebarMobile,
  onToggleMobileSidebar,
  onNavigate,
  onNavigateToModule,
}) => {
  const toggleMobile = onToggleMobileSidebar || onToggleSidebarMobile || (() => {});
  const doNavigate = (mod: string, sub?: string) => {
    if (onNavigateToModule) {
      onNavigateToModule(mod, sub);
    } else if (onNavigate) {
      onNavigate(mod, sub);
    }
  };
  const handleQuick = (action: string) => {
    if (onOpenQuickAction) {
      onOpenQuickAction(action);
    } else {
      // Map quick actions to navigation modules
      if (action === 'novo-funcionario') doNavigate('employees', 'novo');
      else if (action === 'novo-contrato') doNavigate('contracts', 'novo');
      else if (action === 'registar-falta') doNavigate('absences', 'registar');
      else if (action === 'marcar-ferias') doNavigate('vacations', 'planeamento');
      else if (action === 'upload-documento') doNavigate('documents', 'upload');
    }
  };
  const {
    user,
    users,
    switchUser,
    isEmployeeOnly,
    openLoginModal,
    logout,
    lockSystem,
  } = useAuth();
  const { company, visual } = useCompany();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showQuickDropdown, setShowQuickDropdown] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (quickRef.current && !quickRef.current.contains(event.target as Node)) {
        setShowQuickDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotifClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await api.markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    if (notif.link) {
      const cleanPath = notif.link.replace('/', '');
      doNavigate(cleanPath);
      setShowNotifDropdown(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile trigger & Company logo over adjusted company title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobile}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Logo da Empresa por cima / em destaque */}
          <div
            onClick={() => doNavigate('dashboard')}
            className="cursor-pointer group flex items-center shrink-0"
            title="Ir para o Painel Inicial"
          >
            <CompanyLogo size="md" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base leading-tight truncate">
                {company.companyName || visual.systemTitle || 'GESTÃO EMPRESARIAL RH'}
              </span>
              {isEmployeeOnly ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  <IdCard className="w-3 h-3" />
                  Portal do Colaborador
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                  <Shield className="w-3 h-3 text-blue-600" />
                  ERP Corporativo
                </span>
              )}
            </div>
            <span className="hidden md:inline-block text-[11px] text-slate-400 font-medium truncate max-w-xs lg:max-w-md">
              {company.commercialName || 'Grupo Empresarial Delta & Associados, Lda.'} • NIF: {company.nif}
            </span>
          </div>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/60 px-3 py-1.5 rounded-lg transition-colors"
          title="Pesquisa global (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="hidden md:inline">Pesquisar no sistema...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-300 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Quick Action Button Dropdown - hidden for restricted employees */}
        {!isEmployeeOnly && (
          <div className="relative" ref={quickRef}>
            <button
              onClick={() => setShowQuickDropdown(!showQuickDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ação Rápida</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showQuickDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <button
                  onClick={() => {
                    handleQuick('novo-funcionario');
                    setShowQuickDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Novo Funcionário
                </button>
                <button
                  onClick={() => {
                    handleQuick('novo-contrato');
                    setShowQuickDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Emitir Novo Contrato
                </button>
                <button
                  onClick={() => {
                    handleQuick('registar-falta');
                    setShowQuickDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Registar Falta / Ausência
                </button>
                <button
                  onClick={() => {
                    handleQuick('marcar-ferias');
                    setShowQuickDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Solicitar / Planear Férias
                </button>
                <button
                  onClick={() => {
                    handleQuick('upload-documento');
                    setShowQuickDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Anexar Documento ao Arquivo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Access / Login Modal Button */}
        <button
          onClick={openLoginModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
          title="Autenticar como Colaborador (Código) ou Administração (Senha)"
        >
          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Acesso / Trocar</span>
        </button>

        {/* Lock Screen & Secrecy Button */}
        <button
          onClick={lockSystem}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300/80 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 transition-colors shadow-2xs"
          title="Bloquear Sistema imediatamente sob vidro fosco (Sigilo de Informação)"
        >
          <Lock className="w-3.5 h-3.5 text-amber-700" />
          <span className="hidden md:inline">Bloquear / Sigilo</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Notificações e Alertas"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Notificações do Sistema ({notifications.length})
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Sem notificações no momento
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors text-xs ${
                        !n.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.type === 'ALERT' || n.type === 'WARNING' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : n.type === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 flex items-center justify-between">
                            <span>{n.title}</span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 inline-block">
                            {new Date(n.createdAt).toLocaleDateString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                {user?.name || 'Utilizador'}
              </span>
              <span
                className={`text-[10px] font-medium flex items-center gap-1 ${
                  isEmployeeOnly ? 'text-blue-600' : 'text-amber-600'
                }`}
              >
                {isEmployeeOnly ? <IdCard className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {isEmployeeOnly ? 'Colaborador' : user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-slate-500 text-[11px]">Sessão iniciada como</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{user?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user?.email}</p>
                {user?.employeeCode && (
                  <p className="text-[10px] text-blue-600 font-mono mt-0.5 font-semibold">
                    Cód: {user.employeeCode} {user.biNumber ? `• BI: ${user.biNumber}` : ''}
                  </p>
                )}
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                  Nível de Acesso: {user?.role} {isEmployeeOnly ? '(Restrito a Si)' : '(Gestão)'}
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-2 space-y-1 border-b border-slate-100">
                <button
                  onClick={() => {
                    openLoginModal();
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100/80 text-blue-800 font-semibold rounded-lg flex items-center gap-2 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Entrar com Outro BI / Senha
                </button>
              </div>

              {/* Fast Role Simulator for system testing */}
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Trocar Utilizador Rápido:
                </p>
                <div className="space-y-1">
                  {users.slice(0, 5).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                        u.id === user?.id
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'hover:bg-slate-200/60 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{u.name}</span>
                      <span className="text-[10px] opacity-80 uppercase shrink-0 ml-1">
                        {u.role.substring(0, 5)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-1">
                {!isEmployeeOnly && (
                  <button
                    onClick={() => {
                      doNavigate('settings', 'utilizadores');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    Gerir Utilizadores & Permissões
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Terminar Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
