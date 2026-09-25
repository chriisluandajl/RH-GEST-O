import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileSignature,
  FolderLock,
  CalendarDays,
  UserX,
  CreditCard,
  BarChart3,
  Settings,
  ChevronDown,
  X,
  Lock,
  IdCard,
} from 'lucide-react';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { CompanyLogo } from './CompanyLogo.tsx';

interface SidebarProps {
  currentModule?: string;
  activeModule?: string;
  currentSubModule?: string;
  activeSubModule?: string;
  onNavigate: (module: any, subModule?: string) => void;
  isOpenMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subItems?: { id: string; label: string }[];
  isRestrictedForEmployee?: boolean;
}

const toNavigationModule = (id: string): string => {
  switch (id) {
    case 'funcionarios': return 'employees';
    case 'contratos': return 'contracts';
    case 'documentos': return 'documents';
    case 'ferias': return 'vacations';
    case 'faltas': return 'absences';
    case 'salarios': return 'salaries';
    case 'folha': return 'payroll';
    case 'relatorios': return 'reports';
    case 'auditoria': return 'audit';
    case 'configuracoes': return 'settings';
    default: return id;
  }
};

const toSidebarId = (mod: string): string => {
  switch (mod) {
    case 'employees': return 'funcionarios';
    case 'contracts': return 'contratos';
    case 'documents': return 'documentos';
    case 'vacations': return 'ferias';
    case 'absences': return 'faltas';
    case 'salaries':
    case 'payroll': return 'salarios';
    case 'reports': return 'relatorios';
    case 'audit': return 'auditoria';
    case 'settings': return 'configuracoes';
    default: return mod;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  activeModule,
  currentSubModule,
  activeSubModule,
  onNavigate,
  isOpenMobile,
  isMobileOpen,
  onCloseMobile,
}) => {
  const effectiveModule = toSidebarId(activeModule || currentModule || 'dashboard');
  const effectiveSubModule = activeSubModule || currentSubModule;
  const isDrawerOpen = isMobileOpen ?? isOpenMobile ?? false;

  const { company, visual } = useCompany();
  const { isEmployeeOnly, user } = useAuth();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    funcionarios: true,
    contratos: false,
    documentos: false,
    ferias: false,
    faltas: false,
    salarios: true,
    relatorios: false,
    configuracoes: false,
    auditoria: false,
  });

  const toggleExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const menuItems: MenuItem[] = isEmployeeOnly
    ? [
        {
          id: 'dashboard',
          label: 'Meu Painel',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'funcionarios',
          label: 'Minha Ficha & Cadastro',
          icon: <IdCard className="w-4 h-4" />,
          subItems: [
            { id: 'perfil', label: 'Dados Pessoais & Ficha' },
          ],
        },
        {
          id: 'contratos',
          label: 'Meus Contratos',
          icon: <FileSignature className="w-4 h-4" />,
          subItems: [
            { id: 'meus', label: 'Meu Contrato de Trabalho' },
          ],
        },
        {
          id: 'documentos',
          label: 'Meus Documentos',
          icon: <FolderLock className="w-4 h-4" />,
          subItems: [
            { id: 'todos', label: 'Documentos do Processo' },
            { id: 'upload', label: 'Anexar Documento' },
          ],
        },
        {
          id: 'ferias',
          label: 'Minhas Férias',
          icon: <CalendarDays className="w-4 h-4" />,
          subItems: [
            { id: 'planeamento', label: 'Saldo & Marcar Férias' },
          ],
        },
        {
          id: 'faltas',
          label: 'Minhas Faltas & Ausências',
          icon: <UserX className="w-4 h-4" />,
          subItems: [
            { id: 'mapa', label: 'Mapa de Ausências' },
            { id: 'registar', label: 'Justificar Falta' },
          ],
        },
        {
          id: 'salarios',
          label: 'Meus Recibos de Salário',
          icon: <CreditCard className="w-4 h-4" />,
          subItems: [
            { id: 'recibos', label: 'Recibos / Holerites' },
          ],
        },
        {
          id: 'configuracoes',
          label: 'Administração Geral',
          icon: <Lock className="w-4 h-4 text-amber-400" />,
          isRestrictedForEmployee: true,
        },
      ]
    : [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'funcionarios',
          label: 'Funcionários',
          icon: <Users className="w-4 h-4" />,
          subItems: [
            { id: 'todos', label: 'Todos os Funcionários' },
            { id: 'novo', label: 'Cadastrar Funcionário' },
            { id: 'ativos', label: 'Funcionários Ativos' },
            { id: 'inativos', label: 'Funcionários Inativos' },
          ],
        },
        {
          id: 'contratos',
          label: 'Contratos',
          icon: <FileSignature className="w-4 h-4" />,
          subItems: [
            { id: 'todos', label: 'Todos os Contratos' },
            { id: 'novo', label: 'Criar Novo Contrato' },
            { id: 'ativos', label: 'Contratos Ativos' },
            { id: 'a-terminar', label: 'Contratos a Terminar' },
            { id: 'terminados', label: 'Contratos Terminados' },
            { id: 'modelos', label: 'Modelos de Contratos' },
          ],
        },
        {
          id: 'documentos',
          label: 'Documentos',
          icon: <FolderLock className="w-4 h-4" />,
          subItems: [
            { id: 'todos', label: 'Todos os Documentos' },
            { id: 'pendentes', label: 'Documentos Pendentes' },
            { id: 'expirados', label: 'Documentos Expirados' },
            { id: 'arquivo', label: 'Arquivo Digital em Pastas' },
          ],
        },
        {
          id: 'ferias',
          label: 'Férias',
          icon: <CalendarDays className="w-4 h-4" />,
          subItems: [
            { id: 'planeamento', label: 'Planeamento de Férias' },
            { id: 'pendentes', label: 'Férias Pendentes' },
            { id: 'aprovadas', label: 'Férias Aprovadas' },
            { id: 'calendario', label: 'Calendário de Férias' },
          ],
        },
        {
          id: 'faltas',
          label: 'Faltas e Ausências',
          icon: <UserX className="w-4 h-4" />,
          subItems: [
            { id: 'mapa', label: 'Mapa Geral de Faltas' },
            { id: 'registar', label: 'Registar Ausência' },
            { id: 'justificadas', label: 'Faltas Justificadas' },
            { id: 'injustificadas', label: 'Faltas Injustificadas' },
          ],
        },
        {
          id: 'salarios',
          label: 'Salários & Folha',
          icon: <CreditCard className="w-4 h-4" />,
          subItems: [
            { id: 'folhas', label: 'Folha Salarial Mensal' },
            { id: 'registar-salario', label: 'Registar / Ajustar Salário' },
            { id: 'historico', label: 'Histórico Salarial' },
          ],
        },
        {
          id: 'relatorios',
          label: 'Relatórios',
          icon: <BarChart3 className="w-4 h-4" />,
          subItems: [
            { id: 'todos', label: 'Central de Relatórios' },
            { id: 'funcionarios', label: 'Relatório de Funcionários' },
            { id: 'contratos', label: 'Relatório de Contratos' },
            { id: 'ferias', label: 'Relatório de Férias' },
            { id: 'faltas', label: 'Relatório de Faltas' },
            { id: 'salarios', label: 'Relatório Salarial' },
            { id: 'documentos', label: 'Relatório de Documentos' },
          ],
        },
        {
          id: 'auditoria',
          label: 'Auditoria & Logs',
          icon: <FileSignature className="w-4 h-4" />,
        },
        {
          id: 'configuracoes',
          label: 'Configurações',
          icon: <Settings className="w-4 h-4" />,
          subItems: [
            { id: 'empresa', label: 'Dados da Empresa' },
            { id: 'utilizadores', label: 'Utilizadores & Perfis' },
            { id: 'departamentos', label: 'Departamentos & Cargos' },
            { id: 'sistema', label: 'Preferências do Sistema' },
          ],
        },
      ];

  const handleItemClick = (item: MenuItem, subItemId?: string) => {
    const targetModule = toNavigationModule(item.id);
    if (item.subItems && !subItemId) {
      toggleExpand(item.id);
      onNavigate(targetModule, item.subItems[0].id);
    } else {
      onNavigate(targetModule, subItemId);
    }
    if (window.innerWidth < 1024) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 lg:static lg:translate-x-0 shrink-0 ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with CompanyLogo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CompanyLogo size="sm" />
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-extrabold text-sm text-white tracking-tight truncate">
                {company.companyName || 'GESTÃO RH'}
              </span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase truncate">
                {isEmployeeOnly ? 'Portal do Colaborador' : 'Gestão Integrada'}
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>{isEmployeeOnly ? 'Meu Portal' : 'Módulos Corporativos'}</span>
            {isEmployeeOnly && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-900/60 text-blue-300 border border-blue-700/50">
                Colaborador
              </span>
            )}
          </div>

          {menuItems.map((item) => {
            const isActive = effectiveModule === item.id;
            const isExpanded = expandedModules[item.id] || isActive;

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : item.isRestrictedForEmployee
                      ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/40 opacity-75'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span
                      className={`${
                        isActive
                          ? 'text-white'
                          : item.isRestrictedForEmployee
                          ? 'text-amber-400'
                          : 'text-slate-400 group-hover:text-blue-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.isRestrictedForEmployee ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50 font-mono">
                      Sigilo
                    </span>
                  ) : (
                    item.subItems && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    )
                  )}
                </button>

                {/* Submenu items */}
                {item.subItems && isExpanded && (
                  <div className="pl-9 pr-1 py-1 space-y-0.5">
                    {item.subItems.map((sub) => {
                      const isSubActive = isActive && effectiveSubModule === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleItemClick(item, sub.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-2 ${
                            isSubActive
                              ? 'text-blue-400 bg-blue-950/60 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isSubActive ? 'bg-blue-400' : 'bg-slate-600'
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex flex-col gap-1 shrink-0">
          <div className="flex items-center justify-between text-[10px]">
            <span>Base de Dados</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sincronizada
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {isEmployeeOnly
              ? `Colaborador: ${user?.name?.split(' ')[0] || ''}`
              : `Avisos: ${visual.alertNoticeDays || visual.contractExpiryNoticeDays || 30} dias`}
          </div>
        </div>
      </aside>
    </>
  );
};
