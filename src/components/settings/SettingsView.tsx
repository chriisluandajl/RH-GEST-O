import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Briefcase,
  FolderOpen,
  Palette,
  Database,
  Save,
  Plus,
  Trash2,
  Check,
  Download,
  KeyRound,
  ShieldCheck,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  Wifi,
  HardDrive,
  Copy,
  CheckCircle2,
  UploadCloud,
  RefreshCw,
  Laptop,
} from 'lucide-react';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Department, Position, User, RoleType, DocumentCategoryMeta } from '../../types/index.ts';
import { Modal } from '../common/Modal.tsx';

interface SettingsViewProps {
  initialSubModule?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialSubModule }) => {
  const { company, updateCompany, visual, updateVisual } = useCompany();
  const { users, currentUser, hasPermission, addToast, switchUser, refreshUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'empresa' | 'utilizadores' | 'estrutura' | 'categorias' | 'personalizacao' | 'backup'
  >('empresa');

  // Company Form State
  const [compForm, setCompForm] = useState({ ...company });

  // Visual Form State
  const [visForm, setVisForm] = useState({ ...visual });

  // Departments & Positions
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [categories, setCategories] = useState<DocumentCategoryMeta[]>([]);

  // New Department Modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  // New Position Modal
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosDeptId, setNewPosDeptId] = useState('');
  const [newPosBaseSalary, setNewPosBaseSalary] = useState(400000);

  // New User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('ADMINISTRADOR');
  const [newUserPassword, setNewUserPassword] = useState('admin123');

  // Edit / Authorize User Modal
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserCode, setEditUserCode] = useState('');
  const [editUserRole, setEditUserRole] = useState<RoleType>('ADMINISTRADOR');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [showPasswordToggle, setShowPasswordToggle] = useState(false);
  const [userModalError, setUserModalError] = useState<string | null>(null);

  // Server Info & Persistence State
  const [serverInfo, setServerInfo] = useState<{
    port: number;
    hostname: string;
    platform: string;
    localIpAddresses: string[];
    databaseFile: string;
    databaseSizeBytes: number;
    databaseLastModified: string;
    counts: {
      employees: number;
      contracts: number;
      documents: number;
      payrollSheets: number;
      users: number;
      auditLogs: number;
    };
  } | null>(null);
  const [isLoadingServerInfo, setIsLoadingServerInfo] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchServerInfo = async () => {
    try {
      setIsLoadingServerInfo(true);
      const info = await api.getLocalServerInfo();
      setServerInfo(info);
    } catch (err) {
      console.error('Failed to load server info', err);
    } finally {
      setIsLoadingServerInfo(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchServerInfo();
    }
  }, [activeTab]);

  useEffect(() => {
    if (initialSubModule === 'empresa') setActiveTab('empresa');
    else if (initialSubModule === 'utilizadores') setActiveTab('utilizadores');
    else if (initialSubModule === 'departamentos' || initialSubModule === 'cargos') setActiveTab('estrutura');
    else if (initialSubModule === 'backup') setActiveTab('backup');
  }, [initialSubModule]);

  useEffect(() => {
    setCompForm({ ...company });
  }, [company]);

  useEffect(() => {
    setVisForm({ ...visual });
  }, [visual]);

  const loadOrg = async () => {
    try {
      const [d, p, c] = await Promise.all([
        api.getDepartments(),
        api.getPositions(),
        api.getDocumentCategories(),
      ]);
      setDepartments(d);
      setPositions(p);
      setCategories(c);
      if (d.length > 0 && !newPosDeptId) {
        setNewPosDeptId(d[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrg();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompany(compForm);
      addToast('Dados da empresa atualizados com sucesso!', 'success');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar empresa.');
    }
  };

  const handleSaveVisual = (e: React.FormEvent) => {
    e.preventDefault();
    updateVisual(visForm);
    addToast('Preferências visuais e moeda atualizadas!', 'success');
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    try {
      await api.createDepartment({ name: newDeptName, code: newDeptCode });
      addToast(`Departamento "${newDeptName}" criado.`, 'success');
      setIsDeptModalOpen(false);
      setNewDeptName('');
      setNewDeptCode('');
      loadOrg();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar departamento.');
    }
  };

  const handleCreatePos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosTitle || !newPosDeptId) return;
    try {
      await api.createPosition({
        title: newPosTitle,
        departmentId: newPosDeptId,
        baseSalary: Number(newPosBaseSalary),
      });
      addToast(`Cargo "${newPosTitle}" criado.`, 'success');
      setIsPosModalOpen(false);
      setNewPosTitle('');
      loadOrg();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cargo.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError(null);
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setUserModalError('Nome e E-mail são obrigatórios.');
      return;
    }
    if (newUserRole === 'ADMINISTRADOR') {
      if (!newUserPassword || newUserPassword.trim().length < 4) {
        setUserModalError('Ao registar um Administrador, a palavra-passe é obrigatória (mínimo 4 caracteres).');
        return;
      }
    }
    try {
      await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        code: newUserCode.trim() || undefined,
        password: newUserPassword.trim() || undefined,
      });
      addToast(`Utilizador "${newUserName}" registado com sucesso!`, 'success');
      setIsUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserCode('');
      setNewUserPassword('admin123');
      await refreshUsers();
    } catch (err: any) {
      setUserModalError(err.message || 'Erro ao criar utilizador.');
    }
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserCode(u.code || '');
    setEditUserRole(u.role);
    setEditUserPassword(u.password || '');
    setUserModalError(null);
    setShowPasswordToggle(false);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserModalError(null);
    if (!editUserName.trim() || !editUserEmail.trim()) {
      setUserModalError('Nome e E-mail são obrigatórios.');
      return;
    }
    if (editUserRole === 'ADMINISTRADOR') {
      if (!editUserPassword || editUserPassword.trim().length < 4) {
        setUserModalError('Ao autorizar ou atualizar um Administrador, a palavra-passe é obrigatória (mínimo 4 caracteres).');
        return;
      }
    }
    try {
      await api.updateUser(editingUser.id, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        code: editUserCode.trim() || undefined,
        password: editUserPassword.trim() || undefined,
      });
      addToast(`Autorização e dados de "${editUserName}" atualizados!`, 'success');
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      await refreshUsers();
    } catch (err: any) {
      setUserModalError(err.message || 'Erro ao atualizar utilizador.');
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = api.exportBackupUrl();
    addToast('Transferência da cópia de segurança oficial iniciada!', 'success');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsRestoring(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.restoreBackup(parsed);
      addToast('Base de dados restaurada com sucesso! A recarregar...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      addToast(err.message || 'Erro ao restaurar backup. Verifique se o ficheiro é válido.', 'error');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleCopyIp = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIp(url);
    addToast(`Link de rede copiado: ${url}`, 'success');
    setTimeout(() => setCopiedIp(null), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Configurações Gerais do Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personalização institucional, segurança de acessos, estrutura hierárquica e cópias de segurança.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'empresa', label: 'Dados da Empresa', icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'utilizadores', label: 'Utilizadores & Níveis de Acesso', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'estrutura', label: 'Departamentos & Cargos', icon: <Briefcase className="w-3.5 h-3.5" /> },
          { id: 'categorias', label: 'Categorias de Documentos', icon: <FolderOpen className="w-3.5 h-3.5" /> },
          { id: 'personalizacao', label: 'Identidade Visual & Moeda', icon: <Palette className="w-3.5 h-3.5" /> },
          { id: 'backup', label: 'Servidor Local, Rede & Backup', icon: <Server className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl transition-all font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 border ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Empresa */}
      {activeTab === 'empresa' && (
        <form
          onSubmit={handleSaveCompany}
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5 text-xs"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Identificação da Entidade Empregadora</h2>
              <p className="text-slate-500 text-[11px]">
                Estes dados serão apresentados no cabeçalho de todos os contratos, recibos e relatórios oficiais.
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Guardar Alterações
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Razão Social / Denominação Oficial <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={compForm.companyName}
                onChange={(e) => setCompForm({ ...compForm, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nome Comercial / Fantasia</label>
              <input
                type="text"
                value={compForm.tradingName}
                onChange={(e) => setCompForm({ ...compForm, tradingName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NIF (Número Fiscal) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={compForm.nif}
                onChange={(e) => setCompForm({ ...compForm, nif: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nº Registo Comercial</label>
              <input
                type="text"
                value={compForm.commercialRegistryNumber}
                onChange={(e) =>
                  setCompForm({ ...compForm, commercialRegistryNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Representante Legal</label>
              <input
                type="text"
                value={compForm.legalRepresentative}
                onChange={(e) =>
                  setCompForm({ ...compForm, legalRepresentative: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cargo do Representante</label>
              <input
                type="text"
                value={compForm.legalRepresentativeRole}
                onChange={(e) =>
                  setCompForm({ ...compForm, legalRepresentativeRole: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefone Principal</label>
              <input
                type="tel"
                value={compForm.phone1}
                onChange={(e) => setCompForm({ ...compForm, phone1: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">E-mail Corporativo</label>
              <input
                type="email"
                value={compForm.email}
                onChange={(e) => setCompForm({ ...compForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Sede / Morada Oficial</label>
              <input
                type="text"
                value={compForm.address}
                onChange={(e) => setCompForm({ ...compForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Província</label>
              <input
                type="text"
                value={compForm.province}
                onChange={(e) => setCompForm({ ...compForm, province: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Utilizadores */}
      {activeTab === 'utilizadores' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Utilizadores do Sistema & Perfis RBAC</h2>
              <p className="text-slate-500 text-[11px]">
                Gestão de credenciais, cargos e autorizações de acesso às ferramentas de RH.
              </p>
            </div>
            {hasPermission('canManageSettings') && (
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Criar Utilizador
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>{u.name}</span>
                      {u.code && (
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {u.code}
                        </span>
                      )}
                      {u.role === 'ADMINISTRADOR' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          Administrador Autorizado com Senha
                        </span>
                      )}
                      {currentUser?.id === u.id && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          Sessão Atual
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] font-mono mt-0.5">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {u.role}
                  </span>

                  {hasPermission('canManageSettings') && (
                    <button
                      onClick={() => handleOpenEditUser(u)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      title="Autorizar perfil e atualizar palavra-passe"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{u.role === 'ADMINISTRADOR' ? 'Editar / Palavra-passe' : 'Autorizar Administrador'}</span>
                    </button>
                  )}

                  {currentUser?.id !== u.id && (
                    <button
                      onClick={() => switchUser(u.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg transition-colors text-slate-700"
                    >
                      Alternar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Departamentos & Cargos */}
      {activeTab === 'estrutura' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Departamentos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Departamentos</h3>
                <p className="text-slate-400 text-[11px]">Setores e divisões da empresa</p>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Departamento
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {departments.map((d) => (
                <div key={d.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-900">{d.name}</span>
                    <span className="text-[11px] text-slate-400 block font-mono">Código: {d.code}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cargos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Cargos & Funções</h3>
                <p className="text-slate-400 text-[11px]">Títulos funcionais e salários de referência</p>
              </div>
              <button
                onClick={() => setIsPosModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Cargo
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {positions.map((p) => (
                <div key={p.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-900">{p.title}</span>
                    <span className="text-[11px] text-slate-400 block">{p.departmentName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Categorias de Documentos */}
      {activeTab === 'categorias' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tipos & Categorias de Documentos</h2>
              <p className="text-slate-500 text-[11px]">
                Organização de pastas digitais de arquivos cadastrais dos funcionários.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-900">{c.name}</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-1">{c.description}</p>
                <div className="mt-2 text-[10px] text-slate-400">
                  {c.requiresExpiry ? 'Requer controlo de data de validade' : 'Sem prazo de validade'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Personalização Visual & Moeda */}
      {activeTab === 'personalizacao' && (
        <form
          onSubmit={handleSaveVisual}
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5 text-xs max-w-2xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Personalização Visual & Moeda</h2>
              <p className="text-slate-500 text-[11px]">
                Ajuste de cores primárias, símbolo e código da moeda de cálculo salarial.
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Salvar Preferências
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Símbolo da Moeda</label>
              <input
                type="text"
                value={visForm.currencySymbol}
                onChange={(e) => setVisForm({ ...visForm, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Código ISO da Moeda</label>
              <input
                type="text"
                value={visForm.currency}
                onChange={(e) => setVisForm({ ...visForm, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cor Primária Institucional</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={visForm.primaryColor}
                  onChange={(e) => setVisForm({ ...visForm, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={visForm.primaryColor}
                  onChange={(e) => setVisForm({ ...visForm, primaryColor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 6: Servidor Local, Rede & Backup */}
      {activeTab === 'backup' && (
        <div className="space-y-6 text-xs max-w-4xl">
          {/* Top Overview Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Servidor Local Central da Empresa
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ativo & Gravando no Disco
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Este computador atua como o servidor central. Qualquer computador conectado à mesma rede acessa o sistema sem perder dados.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchServerInfo}
                disabled={isLoadingServerInfo}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs self-start sm:self-auto shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServerInfo ? 'animate-spin' : ''}`} />
                Atualizar Estado
              </button>
            </div>

            {/* Storage Info Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Ficheiro Permanente</span>
                <div className="font-mono font-bold text-slate-800 text-xs mt-1 truncate">
                  {serverInfo?.databaseFile || 'data/database.json'}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Gravado no disco rígido</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tamanho da Base</span>
                <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                  {serverInfo ? `${(serverInfo.databaseSizeBytes / 1024).toFixed(1)} KB` : '...'}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Em formato JSON estruturado</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total de Colaboradores</span>
                <div className="font-bold text-slate-800 text-sm mt-1">
                  {serverInfo?.counts.employees ?? '...'} Colaboradores
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Cadastros permanentes</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Contratos & Documentos</span>
                <div className="font-bold text-slate-800 text-sm mt-1">
                  {(serverInfo?.counts.contracts ?? 0) + (serverInfo?.counts.documents ?? 0)} Itens
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {serverInfo?.counts.payrollSheets ?? 0} folhas de salário
                </span>
              </div>
            </div>

            {/* Firebase Cloud Firestore Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-transparent border border-amber-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">Google Cloud Firestore (Firebase)</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Conectado & Provisionado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Banco de dados na nuvem ativo. Permite hospedar no Render, Koyeb ou executar localmente sem nunca perder dados.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-white/90 rounded-lg border border-amber-200/60">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Projeto Firebase</span>
                  <code className="text-amber-900 font-mono font-bold text-xs mt-0.5 block">nodal-scheduler-xlxdt</code>
                </div>
                <div className="p-2.5 bg-white/90 rounded-lg border border-amber-200/60">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Regras de Segurança ABAC</span>
                  <span className="text-emerald-700 font-bold text-xs mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Regras implantadas e ativas no Google Cloud
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Network Access & Multi-Computer Connection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Como Conectar Outros Computadores e Celulares na Empresa
                </h3>
              </div>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Qualquer computador (recepção, RH, diretoria) ou tablet/celular conectado ao mesmo Wi-Fi ou cabo de rede do escritório pode aceder ao sistema abrindo o navegador no endereço abaixo:
              </p>
            </div>

            {/* IP Addresses List */}
            <div className="space-y-2.5">
              {/* Localhost */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Acesso neste mesmo computador (PC Servidor)</div>
                    <code className="text-xs text-blue-600 font-mono font-semibold">
                      http://localhost:{serverInfo?.port || 3000}
                    </code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyIp(`http://localhost:${serverInfo?.port || 3000}`)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs self-start sm:self-auto shrink-0 shadow-2xs"
                >
                  {copiedIp === `http://localhost:${serverInfo?.port || 3000}` ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Local Network IPs */}
              {serverInfo?.localIpAddresses && serverInfo.localIpAddresses.length > 0 ? (
                serverInfo.localIpAddresses.map((ip) => {
                  const url = `http://${ip}:${serverInfo.port || 3000}`;
                  const isCopied = copiedIp === url;
                  return (
                    <div
                      key={ip}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Wifi className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Acesso para outros computadores na mesma rede Wi-Fi / Cabo:
                          </div>
                          <code className="text-xs text-blue-700 font-mono font-bold">
                            {url}
                          </code>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyIp(url)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs self-start sm:self-auto shrink-0 shadow-xs"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Link para outros PCs</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  A carregar endereços de rede local... (Caso esteja a rodar em nuvem, o acesso é via URL do Cloud Run).
                </div>
              )}
            </div>

            {/* Zero Data Loss Guarantee Box */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Garantia de Persistência: Como o salvamento funciona sem perda de dados?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-900/90 pl-1 leading-relaxed">
                <li>
                  <strong>Gravação Centralizada Imediata:</strong> Quando qualquer utilizador logado em outro computador cadastra um funcionário, aprova férias ou processa salários, a alteração é enviada diretamente pela rede e salva no disco deste PC servidor no arquivo <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono text-emerald-800">data/database.json</code>.
                </li>
                <li>
                  <strong>Independência de Navegador:</strong> Os dados <em>não</em> ficam guardados no navegador do outro computador. Se a pessoa desligar o computador dela, fechar a aba ou limpar o histórico, <strong>nada é perdido</strong>.
                </li>
                <li>
                  <strong>Sincronização em Tempo Real:</strong> Todos os computadores ligados consultam e gravam na mesma base de dados. O que um funcionário faz é visualizado pelos outros instantaneamente.
                </li>
              </ul>
            </div>
          </div>

          {/* Backup & Restore Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Cópias de Segurança & Restauro (Backups Oficiais)
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Exporte o banco de dados oficial completo para guardar em pen drive ou nuvem, ou restaure um backup anterior.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Box */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/70 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-blue-600" />
                    Exportar Cópia Completa (.JSON)
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px] mt-1.5">
                    Gera um download com todos os registos: colaboradores, contratos, recibos, histórico salarial, departamentos e configurações da empresa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <Download className="w-4 h-4" />
                  Descarregar Ficheiro de Backup (.json)
                </button>
              </div>

              {/* Import/Restore Box */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-amber-600" />
                    Restaurar Dados a Partir de Ficheiro
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px] mt-1.5">
                    Substitui ou restaura a base de dados a partir de um ficheiro JSON previamente descarregado (útil ao mudar de computador ou resgatar dados).
                  </p>
                </div>
                <label className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer text-center">
                  <UploadCloud className="w-4 h-4" />
                  <span>{isRestoring ? 'A restaurar...' : 'Selecionar Ficheiro para Restaurar'}</span>
                  <input
                    type="file"
                    accept=".json"
                    disabled={isRestoring}
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions for Local PC */}
          <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Guia Rápido: Como Executar o Sistema no seu Computador
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Para transformar o seu computador no servidor da sua empresa em qualquer altura, siga os 3 passos simples abaixo:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Passo 1</span>
                <strong className="text-white block">Instalar Dependências</strong>
                <p className="text-[11px] text-slate-300 leading-normal">
                  Abra a pasta do sistema no terminal (CMD ou PowerShell) e execute uma única vez:
                </p>
                <code className="block bg-slate-950 px-2.5 py-1.5 rounded font-mono text-emerald-400 text-[11px]">
                  npm install
                </code>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Passo 2</span>
                <strong className="text-white block">Iniciar o Servidor</strong>
                <p className="text-[11px] text-slate-300 leading-normal">
                  Para ligar o servidor no seu PC, execute no terminal:
                </p>
                <code className="block bg-slate-950 px-2.5 py-1.5 rounded font-mono text-emerald-400 text-[11px]">
                  npm start
                </code>
                <span className="text-[10px] text-slate-400 block">(ou npm run dev em desenvolvimento)</span>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Passo 3</span>
                <strong className="text-white block">Conectar os Computadores</strong>
                <p className="text-[11px] text-slate-300 leading-normal">
                  Nos outros computadores da empresa conectados ao mesmo Wi-Fi, abra o navegador e digite o IP mostrado acima (ex: <span className="text-emerald-400">http://192.168.1.100:3000</span>).
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-[11px] text-slate-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">Dica sobre o Firewall do Windows:</strong> Quando você executar pela primeira vez, o Windows exibirá uma mensagem "O Firewall do Windows bloqueou alguns recursos deste aplicativo". Basta clicar em <strong>"Permitir acesso"</strong> em Redes Privadas para que os outros computadores consigam conectar sem restrições.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Departamento */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Criar Novo Departamento"
        subtitle="Adicione uma divisão orgânica à empresa"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateDept}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Criar Departamento
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateDept} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nome do Departamento</label>
            <input
              type="text"
              required
              placeholder="Ex: Engenharia & Desenvolvimento"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Código do Departamento</label>
            <input
              type="text"
              required
              placeholder="Ex: ENG"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Novo Cargo */}
      <Modal
        isOpen={isPosModalOpen}
        onClose={() => setIsPosModalOpen(false)}
        title="Criar Novo Cargo"
        subtitle="Defina o título e departamento correspondente"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsPosModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreatePos}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Criar Cargo
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreatePos} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Título do Cargo</label>
            <input
              type="text"
              required
              placeholder="Ex: Arquiteto de Software"
              value={newPosTitle}
              onChange={(e) => setNewPosTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Departamento</label>
            <select
              value={newPosDeptId}
              onChange={(e) => setNewPosDeptId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Modal: Novo Utilizador */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Criar Novo Utilizador de Acesso"
        subtitle="Registe credenciais e perfil de permissões"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateUser}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Criar Conta
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          {userModalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{userModalError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Ex: Carlos Ferreira"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">E-mail de Acesso</label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="admin@delta-empresarial.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Código de Utilizador no Sistema</label>
            <input
              type="text"
              value={newUserCode}
              onChange={(e) => setNewUserCode(e.target.value.toUpperCase())}
              placeholder={newUserRole === 'ADMINISTRADOR' ? 'Ex: ADM-002' : 'Ex: USER-002'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nível de Permissão (Perfil)</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="ADMINISTRADOR">ADMINISTRADOR (Total Acesso - Requer Senha)</option>
              <option value="RH">RH (Recursos Humanos)</option>
              <option value="CONTABILIDADE">CONTABILIDADE (Salários e Finanças)</option>
              <option value="GESTOR">GESTOR (Aprovações e Equipas)</option>
              <option value="UTILIZADOR">UTILIZADOR (Colaborador)</option>
            </select>
          </div>

          {newUserRole === 'ADMINISTRADOR' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Exigência de Segurança:</strong> Ao registar um Administrador, a palavra-passe é obrigatória para assegurar o sigilo de todas as informações.
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Palavra-passe / Senha {newUserRole === 'ADMINISTRADOR' ? '(Obrigatória - Mínimo 4 caracteres)' : '(Opcional)'}
            </label>
            <div className="relative">
              <input
                type={showPasswordToggle ? 'text' : 'password'}
                required={newUserRole === 'ADMINISTRADOR'}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Introduza uma palavra-passe"
                className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPasswordToggle(!showPasswordToggle)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPasswordToggle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar / Autorizar Administrador */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setEditingUser(null);
        }}
        title="Autorizar & Atualizar Utilizador"
        subtitle="Registe o perfil e a respetiva palavra-passe obrigatória para Administradores"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                setIsEditUserModalOpen(false);
                setEditingUser(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpdateUser}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              Guardar / Autorizar
            </button>
          </div>
        }
      >
        <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
          {userModalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{userModalError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">E-mail de Acesso</label>
            <input
              type="email"
              required
              value={editUserEmail}
              onChange={(e) => setEditUserEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Código de Sistema (Ex: ADM-001)</label>
            <input
              type="text"
              value={editUserCode}
              onChange={(e) => setEditUserCode(e.target.value.toUpperCase())}
              placeholder="Ex: ADM-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nível de Permissão (Perfil)</label>
            <select
              value={editUserRole}
              onChange={(e) => setEditUserRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="ADMINISTRADOR">ADMINISTRADOR (Total Acesso - Requer Senha)</option>
              <option value="RH">RH (Recursos Humanos)</option>
              <option value="CONTABILIDADE">CONTABILIDADE (Salários e Finanças)</option>
              <option value="GESTOR">GESTOR (Aprovações e Equipas)</option>
              <option value="UTILIZADOR">UTILIZADOR (Colaborador)</option>
            </select>
          </div>

          {editUserRole === 'ADMINISTRADOR' && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Lock className="w-4 h-4 text-amber-600" />
                Autorização com Palavra-passe Obrigatória
              </div>
              <p className="text-[11px] text-amber-700">
                Para autorizar ou manter este utilizador como <strong>Administrador</strong>, deve definir ou atualizar uma palavra-passe válida de pelo menos 4 caracteres.
              </p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {editUserRole === 'ADMINISTRADOR'
                ? 'Palavra-passe de Administrador (Obrigatória)'
                : 'Palavra-passe de Acesso'}
            </label>
            <div className="relative">
              <input
                type={showPasswordToggle ? 'text' : 'password'}
                required={editUserRole === 'ADMINISTRADOR'}
                value={editUserPassword}
                onChange={(e) => setEditUserPassword(e.target.value)}
                placeholder="Insira a palavra-passe do utilizador"
                className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPasswordToggle(!showPasswordToggle)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPasswordToggle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Esta palavra-passe será exigida ao iniciar sessão com o perfil administrativo.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};
