import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  User as UserIcon,
  Lock,
  IdCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Search,
  X,
  Check,
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo.tsx';
import { initialUsers, initialEmployees } from '../../../server/initialData.ts';
import { Employee, User } from '../../types/index.ts';

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
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');

  // Employee Tab State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeePassword, setEmployeePassword] = useState('');
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  // Admin Tab State
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [adminCodeOrEmail, setAdminCodeOrEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const empPasswordInputRef = useRef<HTMLInputElement>(null);
  const adminPasswordInputRef = useRef<HTMLInputElement>(null);

  const effectiveEmployees = useMemo(() => {
    return employeesList.length > 0 ? employeesList : initialEmployees;
  }, [employeesList]);

  const effectiveAdmins = useMemo(() => {
    const list = users.length > 0 ? users : initialUsers;
    return list.filter((u) => u.role !== 'UTILIZADOR');
  }, [users]);

  // Filtered employees based on search
  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return effectiveEmployees.slice(0, 10);
    return effectiveEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(term) ||
        e.code.toLowerCase().includes(term) ||
        e.idNumber.toLowerCase().includes(term) ||
        (e.nif && e.nif.toLowerCase().includes(term)) ||
        (e.departmentName && e.departmentName.toLowerCase().includes(term)) ||
        (e.positionName && e.positionName.toLowerCase().includes(term))
    );
  }, [effectiveEmployees, employeeSearch]);

  // Filtered admins based on search
  const filteredAdmins = useMemo(() => {
    const term = adminSearch.trim().toLowerCase();
    if (!term) return effectiveAdmins;
    return effectiveAdmins.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        (u.code && u.code.toLowerCase().includes(term)) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
    );
  }, [effectiveAdmins, adminSearch]);

  useEffect(() => {
    if (isOpen) {
      setEmployeeError(null);
      setAdminError(null);
      // Pre-select first admin or current user if empty
      if (!selectedAdmin && effectiveAdmins.length > 0) {
        const defaultAdmin = effectiveAdmins[0];
        setSelectedAdmin(defaultAdmin);
        setAdminCodeOrEmail(defaultAdmin.code || defaultAdmin.email);
      }
    }
  }, [isOpen, effectiveAdmins]);

  if (!isOpen) return null;

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployeeSearch(emp.fullName);
    setIsEmployeeDropdownOpen(false);
    setEmployeeError(null);
    setTimeout(() => {
      empPasswordInputRef.current?.focus();
    }, 100);
  };

  const handleClearEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setEmployeePassword('');
    setIsEmployeeDropdownOpen(true);
  };

  const handleSelectAdmin = (adm: User) => {
    setSelectedAdmin(adm);
    setAdminCodeOrEmail(adm.code || adm.email);
    setAdminSearch(adm.name);
    setIsAdminDropdownOpen(false);
    setAdminError(null);
    setTimeout(() => {
      adminPasswordInputRef.current?.focus();
    }, 100);
  };

  const handleClearAdmin = () => {
    setSelectedAdmin(null);
    setAdminCodeOrEmail('');
    setAdminSearch('');
    setAdminPassword('');
    setIsAdminDropdownOpen(true);
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeError(null);

    const identifier = selectedEmployee ? selectedEmployee.code : employeeSearch.trim();

    if (!identifier) {
      setEmployeeError('Por favor, pesquise e selecione o seu nome ou informe o seu Código de Funcionário.');
      return;
    }

    if (!employeePassword.trim()) {
      setEmployeeError(
        `A palavra-passe é obrigatória. A sua senha inicial é o seu Código do Sistema (ex: ${
          selectedEmployee?.code || 'EMP-001'
        }) e pode ser alterada no seu perfil.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await loginAsEmployee(identifier, employeePassword.trim());
      onClose();
    } catch (err: any) {
      setEmployeeError(
        err.message ||
          'Palavra-passe incorreta ou colaborador não encontrado. Verifique as credenciais.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const identifier = selectedAdmin ? (selectedAdmin.code || selectedAdmin.email) : adminCodeOrEmail.trim();

    if (!identifier) {
      setAdminError('Pesquise e selecione o seu utilizador administrativo ou informe o seu Código/E-mail.');
      return;
    }

    if (!adminPassword.trim()) {
      setAdminError('A palavra-passe é obrigatória para autorizar o acesso administrativo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginAsAdmin(identifier, adminPassword.trim());
      onClose();
    } catch (err: any) {
      setAdminError(err.message || 'Código ou palavra-passe administrativa incorreta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300"
      onClick={(e) => {
        if (!isLocked && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-xl bg-slate-900/95 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-7 text-white overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button if unlocked */}
        {!isLocked && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20 cursor-pointer"
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
                Portal de Acesso & Gestão de Pessoal
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
              <span className="font-bold text-white block">Área de Trabalho Ocultada sob Sigilo:</span>
              <p className="text-[11px] text-blue-300/90 leading-relaxed">
                Nenhum dado laboral ou salarial é visível até que o utilizador pesquise o seu perfil e confirme a sua <strong>Palavra-passe pessoal</strong>.
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
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'employee'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <IdCard className="w-4 h-4 text-blue-200" />
            <span>Portal do Colaborador</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 font-mono">
              Pesquisar + Senha
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setEmployeeError(null);
              setAdminError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-200" />
            <span>Administrador</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 font-mono">
              Gestão + Senha
            </span>
          </button>
        </div>

        {/* TAB 1: EMPLOYEE LOGIN */}
        {activeTab === 'employee' && (
          <form onSubmit={handleEmployeeLogin} className="relative z-10 mt-4 space-y-4">
            {employeeError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{employeeError}</span>
              </div>
            )}

            {/* Employee Search & Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                <span>Pesquisar e Selecionar Colaborador</span>
                {selectedEmployee && (
                  <button
                    type="button"
                    onClick={handleClearEmployee}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Trocar / Limpar
                  </button>
                )}
              </label>

              {selectedEmployee ? (
                <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedEmployee.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={selectedEmployee.fullName}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-blue-400/50"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                        <span>{selectedEmployee.fullName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 text-[10px] font-mono">
                          {selectedEmployee.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {selectedEmployee.departmentName} • BI: {selectedEmployee.idNumber}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearEmployee}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                    title="Remover seleção"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setIsEmployeeDropdownOpen(true);
                      }}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      placeholder="Pesquise pelo seu Nome, Código (EMP-001) ou BI..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/20 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 text-white placeholder-slate-400"
                      autoFocus
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isEmployeeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-slate-900 border border-white/20 rounded-xl shadow-2xl z-30 divide-y divide-white/5">
                      <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5 sticky top-0">
                        Selecione o seu perfil na lista ({filteredEmployees.length} encontrados):
                      </div>
                      {filteredEmployees.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          Nenhum colaborador encontrado com "{employeeSearch}".
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleSelectEmployee(emp)}
                            className="w-full text-left p-2.5 hover:bg-blue-600/30 transition-colors flex items-center gap-3 cursor-pointer group"
                          >
                            <img
                              src={emp.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={emp.fullName}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-white group-hover:text-blue-300 truncate">
                                {emp.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                                <span className="text-blue-400 font-bold">{emp.code}</span>
                                <span>•</span>
                                <span className="truncate">{emp.departmentName}</span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 group-hover:bg-blue-500 group-hover:text-white font-medium">
                              Selecionar
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password Field (Masked, Never Exposed) */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Palavra-passe Pessoal (Obrigatória & Confidencial)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  ref={empPasswordInputRef}
                  type={showEmployeePassword ? 'text' : 'password'}
                  value={employeePassword}
                  onChange={(e) => setEmployeePassword(e.target.value)}
                  placeholder="Introduza a sua palavra-passe"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-white/20 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 text-white placeholder-slate-400 font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowEmployeePassword(!showEmployeePassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  title={showEmployeePassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showEmployeePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                🔒 A sua senha inicial padrão é o seu <strong>Código do Sistema</strong> (Ex:{' '}
                <span className="text-blue-300 font-mono font-semibold">
                  {selectedEmployee?.code || 'EMP-001'}
                </span>
                ). Poderá alterá-la para uma senha pessoal no menu do seu perfil a qualquer momento.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'A validar palavra-passe...' : 'Desbloquear & Aceder ao Meu Portal'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ADMIN LOGIN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="relative z-10 mt-4 space-y-4">
            {adminError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{adminError}</span>
              </div>
            )}

            {/* Admin Search & Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                <span>Pesquisar e Selecionar Administrador</span>
                {selectedAdmin && (
                  <button
                    type="button"
                    onClick={handleClearAdmin}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Trocar / Limpar
                  </button>
                )}
              </label>

              {selectedAdmin ? (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedAdmin.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={selectedAdmin.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-amber-400/50"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                        <span>{selectedAdmin.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px] font-mono">
                          {selectedAdmin.code || 'ADM'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {selectedAdmin.email} • Perfil: {selectedAdmin.role}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAdmin}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                    title="Remover seleção"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={adminSearch}
                      onChange={(e) => {
                        setAdminSearch(e.target.value);
                        setAdminCodeOrEmail(e.target.value);
                        setIsAdminDropdownOpen(true);
                      }}
                      onFocus={() => setIsAdminDropdownOpen(true)}
                      placeholder="Pesquise administrador por Nome, Código (ADM-001) ou E-mail..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/20 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/10 text-white placeholder-slate-400"
                      autoFocus
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isAdminDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-slate-900 border border-white/20 rounded-xl shadow-2xl z-30 divide-y divide-white/5">
                      <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5 sticky top-0">
                        Administradores autorizados ({filteredAdmins.length}):
                      </div>
                      {filteredAdmins.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          Nenhum administrador encontrado com "{adminSearch}".
                        </div>
                      ) : (
                        filteredAdmins.map((adm) => (
                          <button
                            key={adm.id}
                            type="button"
                            onClick={() => handleSelectAdmin(adm)}
                            className="w-full text-left p-2.5 hover:bg-amber-600/30 transition-colors flex items-center gap-3 cursor-pointer group"
                          >
                            <img
                              src={adm.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                              alt={adm.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                                {adm.name}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                                <span className="text-amber-400 font-bold">{adm.code || 'ADM'}</span>
                                <span>•</span>
                                <span className="truncate">{adm.email}</span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 group-hover:bg-amber-500 group-hover:text-white font-medium">
                              Selecionar
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Password Field (Masked, Never Exposed) */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Palavra-passe Administrativa (Obrigatória & Confidencial)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  ref={adminPasswordInputRef}
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Introduza a palavra-passe administrativa"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-white/20 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/10 text-white placeholder-slate-400 font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  title={showAdminPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                🛡️ Apenas administradores autorizados com credenciais válidas têm acesso aos módulos globais de remunerações, contratos e configurações.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmitting ? 'A validar palavra-passe...' : 'Validar Senha & Aceder à Gestão'}
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
                Sessão em curso: <strong className="text-white">{user.name}</strong> ({user.role})
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Manter sessão
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
