import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  User,
  Lock,
  IdCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo.tsx';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    users,
    employeesList,
    loginAsEmployee,
    loginAsAdmin,
    isLocked,
    addToast,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');

  // Employee Form State
  const [employeeIdentifier, setEmployeeIdentifier] = useState('');
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Form State
  const [adminCodeOrEmail, setAdminCodeOrEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeError(null);
    if (!employeeIdentifier.trim()) {
      setEmployeeError('Por favor, informe o seu Código de Funcionário no Sistema (Ex: EMP-001) ou BI.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginAsEmployee(employeeIdentifier.trim());
      onClose();
    } catch (err: any) {
      setEmployeeError(err.message || 'Colaborador não encontrado com o Código informado. Verifique os dados com o RH.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    if (!adminCodeOrEmail.trim()) {
      setAdminError('Informe o seu Código de Administrador (Ex: ADM-001) ou E-mail.');
      return;
    }
    if (!adminPassword.trim()) {
      setAdminError('A palavra-passe é obrigatória para autorizar o acesso administrativo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginAsAdmin(adminCodeOrEmail.trim(), adminPassword.trim());
      onClose();
    } catch (err: any) {
      setAdminError(err.message || 'Código ou palavra-passe administrativa incorreta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickEmployeeSelect = async (code: string) => {
    setEmployeeIdentifier(code);
    setIsSubmitting(true);
    try {
      await loginAsEmployee(code);
      onClose();
    } catch (err: any) {
      setEmployeeError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdminSelect = (codeOrEmail: string, pass: string = 'admin123') => {
    setAdminCodeOrEmail(codeOrEmail);
    setAdminPassword(pass);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300"
      onClick={(e) => {
        // If not locked and user clicks outside, allow close
        if (!isLocked && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-7 text-white overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button if unlocked */}
        {!isLocked && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Branding & Lock Status */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-2xl bg-white/10 border border-white/20 shadow-inner">
              <CompanyLogo size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Protocolo de Segurança e Sigilo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  {isLocked ? 'Bloqueio Ativo' : 'Sessão Ativa'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Portal de Acesso & Controlo de Sigilo
              </h1>
              <p className="text-[11px] text-slate-400">
                Gestão Empresarial RH • Proteção de Dados Laborais e Vencimentos
              </p>
            </div>
          </div>
        </div>

        {/* Frosted Glass Secrecy Banner */}
        {isLocked && (
          <div className="relative z-10 mt-4 p-3.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-200">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-white block">Área de Trabalho Ocultada sob Vidro Fosco:</span>
              <p className="text-[11px] text-blue-300/90 leading-relaxed">
                Nenhum dado é visível até que o colaborador insira o seu <strong>Código do Sistema</strong> ou o Administrador confirme a sua <strong>Palavra-passe</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="relative z-10 mt-5 flex rounded-2xl bg-white/5 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveTab('employee');
              setEmployeeError(null);
              setAdminError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'employee'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <IdCard className="w-4 h-4 text-blue-200" />
            <span>Portal do Colaborador</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 font-mono">
              Código do Sistema
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setEmployeeError(null);
              setAdminError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-200" />
            <span>Administrador</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 font-mono">
              Código + Senha
            </span>
          </button>
        </div>

        {/* TAB 1: EMPLOYEE LOGIN (CÓDIGO DO SISTEMA) */}
        {activeTab === 'employee' && (
          <form onSubmit={handleEmployeeLogin} className="relative z-10 mt-4 space-y-4">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-slate-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Sigilo Individual Garantido:</strong> O funcionário entra exclusivamente com o seu <strong>Código do Sistema</strong> (Ex: EMP-001) e visualiza apenas a sua própria ficha, contratos, férias, faltas e recibos. Nenhuma informação de outros empregados é acessível.
              </div>
            </div>

            {employeeError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{employeeError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Código do Funcionário no Sistema (ou Número do BI)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <IdCard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={employeeIdentifier}
                  onChange={(e) => setEmployeeIdentifier(e.target.value)}
                  placeholder="Ex: EMP-001 ou 003418291LA042"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/20 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 text-white placeholder-slate-400"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Insira o seu código interno de colaborador atribuído pelo RH ou o número do Bilhete de Identidade.
              </p>
            </div>

            {/* Quick click chips for demonstration/testing */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Colaboradores registados para teste rápido:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {employeesList.slice(0, 6).map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleQuickEmployeeSelect(emp.code)}
                    className="text-left p-2 rounded-xl border border-white/10 hover:border-blue-400/60 bg-white/5 hover:bg-blue-900/30 transition-all flex items-center gap-2.5 group"
                  >
                    <img
                      src={emp.photoUrl}
                      alt={emp.fullName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/20"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate group-hover:text-blue-300">
                        {emp.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <span className="font-bold text-blue-400">{emp.code}</span>
                        <span>•</span>
                        <span className="truncate">{emp.departmentName || 'Departamento'}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'A verificar código...' : 'Desbloquear & Aceder ao Meu Portal'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ADMIN LOGIN (CÓDIGO + SENHA) */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="relative z-10 mt-4 space-y-4">
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-[11px] text-amber-200 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Acesso Administrativo com Senha:</strong> Os administradores entram com o seu <strong>Código</strong> (Ex: ADM-001) e a respetiva <strong>Palavra-passe</strong> para desbloquear a gestão integral de quadros, salários e auditoria.
              </div>
            </div>

            {adminError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{adminError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Código ou E-mail do Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={adminCodeOrEmail}
                  onChange={(e) => setAdminCodeOrEmail(e.target.value)}
                  placeholder="Ex: ADM-001 ou admin@delta-empresarial.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/20 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/10 text-white placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Palavra-passe / Senha Administrativa (Obrigatória)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Palavra-passe de administrador"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-white/20 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/10 text-white placeholder-slate-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Senha padrão configurada: <strong className="text-amber-300 font-mono">admin123</strong>
              </p>
            </div>

            {/* Quick Admin Profile Selection */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Administradores autorizados rápidos:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {users
                  .filter((u) => u.role !== 'UTILIZADOR')
                  .slice(0, 4)
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickAdminSelect(u.code || u.email, u.password || 'admin123')}
                      className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                        adminCodeOrEmail === (u.code || u.email)
                          ? 'border-amber-500 bg-amber-500/20 text-white'
                          : 'border-white/10 hover:border-white/20 bg-white/5 text-slate-300'
                      }`}
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/20"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{u.name}</div>
                        <div className="text-[10px] text-amber-300 font-mono">
                          {u.code || 'ADM'} • {u.role}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmitting ? 'A validar palavra-passe...' : 'Validar Senha & Desbloquear Gestão Global'}
              </button>
            </div>
          </form>
        )}

        {/* Current Session status when not locked */}
        {!isLocked && user && (
          <div className="relative z-10 pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Conectado como: <strong className="text-white">{user.name}</strong> ({user.role})
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white font-semibold transition-colors"
            >
              Manter sessão atual
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
