import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { CompanyProvider, useCompany } from './context/CompanyContext.tsx';
import { Sidebar } from './components/common/Sidebar.tsx';
import { Header } from './components/common/Header.tsx';
import { GlobalSearchModal } from './components/common/GlobalSearchModal.tsx';
import { LoginModal } from './components/common/LoginModal.tsx';
import { AccessRestrictedCard } from './components/common/AccessRestrictedCard.tsx';
import { DashboardOverview } from './components/dashboard/DashboardOverview.tsx';
import { EmployeesView } from './components/employees/EmployeesView.tsx';
import { ContractsView } from './components/contracts/ContractsView.tsx';
import { DocumentsView } from './components/documents/DocumentsView.tsx';
import { VacationsView } from './components/vacations/VacationsView.tsx';
import { AbsencesView } from './components/absences/AbsencesView.tsx';
import { PayrollView } from './components/payroll/PayrollView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { AuditView } from './components/audit/AuditView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { NavigationModule } from './types/index.ts';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    toasts,
    removeToast,
    isEmployeeOnly,
    currentEmployee,
    user,
    isLocked,
    isLoginModalOpen,
    closeLoginModal,
    openLoginModal,
  } = useAuth();
  const { company } = useCompany();

  // Navigation State
  const [activeModule, setActiveModule] = useState<NavigationModule>('dashboard');
  const [activeSubModule, setActiveSubModule] = useState<string | undefined>(undefined);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(undefined);
  const [selectedEmployeeContextId, setSelectedEmployeeContextId] = useState<string | undefined>(undefined);

  // Global Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Default collaborator identifier
  const employeeSelfId = isEmployeeOnly ? (currentEmployee?.id || user?.employeeId) : undefined;

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (module: NavigationModule, subModule?: string) => {
    setActiveModule(module);
    setActiveSubModule(subModule);
    setSelectedEntityId(undefined);
    setSelectedEmployeeContextId(undefined);
    setIsMobileSidebarOpen(false);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectSearchResult = (type: string, id: string) => {
    setIsSearchOpen(false);
    if (type === 'employee') {
      setActiveModule('employees');
      setSelectedEntityId(id);
    } else if (type === 'contract') {
      setActiveModule('contracts');
      setSelectedEntityId(id);
    } else if (type === 'document') {
      setActiveModule('documents');
      setSelectedEntityId(id);
    }
  };

  return (
    <>
      <div
        className={`flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans transition-all duration-300 ${
          isLocked ? 'filter blur-md select-none pointer-events-none opacity-40 brightness-75' : ''
        }`}
      >
        {/* Sidebar - Desktop static in flex and Mobile Drawer */}
        <Sidebar
          activeModule={activeModule}
          onNavigate={handleNavigate}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <Header
            onOpenSearch={() => setIsSearchOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onNavigateToModule={(mod, sub) => handleNavigate(mod as NavigationModule, sub)}
          />

          {/* Scrollable Workspace View */}
          <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 w-full">
            <div className="w-full max-w-7xl mx-auto space-y-6">
            {activeModule === 'dashboard' && (
              <DashboardOverview
                onNavigate={(mod, sub) => handleNavigate(mod as NavigationModule, sub)}
                onSelectEmployee={(empId: string) => {
                  setActiveModule('employees');
                  setSelectedEntityId(empId);
                }}
                onSelectContract={(contractId: string) => {
                  setActiveModule('contracts');
                  setSelectedEntityId(contractId);
                }}
              />
            )}

            {activeModule === 'employees' && (
              <EmployeesView
                initialSubModule={activeSubModule}
                initialSelectedId={selectedEntityId || employeeSelfId}
                onOpenNewContract={(empId) => {
                  setActiveModule('contracts');
                  setActiveSubModule('novo');
                  setSelectedEmployeeContextId(empId);
                }}
                onOpenNewVacation={(empId) => {
                  setActiveModule('vacations');
                  setActiveSubModule('marcar');
                  setSelectedEmployeeContextId(empId);
                }}
                onOpenNewAbsence={(empId) => {
                  setActiveModule('absences');
                  setActiveSubModule('registar');
                  setSelectedEmployeeContextId(empId);
                }}
                onOpenNewDocument={(empId) => {
                  setActiveModule('documents');
                  setActiveSubModule('anexar');
                  setSelectedEmployeeContextId(empId);
                }}
              />
            )}

            {activeModule === 'contracts' && (
              <ContractsView
                initialSubModule={activeSubModule}
                initialSelectedId={selectedEntityId}
                initialEmployeeId={employeeSelfId || selectedEmployeeContextId}
              />
            )}

            {activeModule === 'documents' && (
              <DocumentsView
                initialSubModule={activeSubModule}
                initialEmployeeId={employeeSelfId || selectedEmployeeContextId}
              />
            )}

            {activeModule === 'vacations' && (
              <VacationsView
                initialSubModule={activeSubModule}
                initialEmployeeId={employeeSelfId || selectedEmployeeContextId}
              />
            )}

            {activeModule === 'absences' && (
              <AbsencesView
                initialSubModule={activeSubModule}
                initialEmployeeId={employeeSelfId || selectedEmployeeContextId}
              />
            )}

            {/* Handle both 'payroll' and 'salaries' routes */}
            {(activeModule === 'payroll' || activeModule === 'salaries') && (
              <PayrollView
                initialSubModule={activeSubModule}
                initialSelectedId={selectedEntityId}
              />
            )}

            {/* Restricted corporate modules for collaborators */}
            {activeModule === 'reports' && (
              isEmployeeOnly ? (
                <AccessRestrictedCard
                  title="Relatórios Executivos & Estratégicos Bloqueados"
                  description="A emissão de relatórios globais de quadros, despesas salariais consolidadas e absentismo geral é reservada à Direção Geral e Recursos Humanos."
                  onGoBack={() => handleNavigate('dashboard')}
                  onSwitchAccount={openLoginModal}
                />
              ) : (
                <ReportsView />
              )
            )}

            {activeModule === 'audit' && (
              isEmployeeOnly ? (
                <AccessRestrictedCard
                  title="Registo de Auditoria & Logs do Sistema Restrito"
                  description="O histórico rastreável de operações, auditorias e logs de transações é estritamente confidencial para conformidade e segurança da informação."
                  onGoBack={() => handleNavigate('dashboard')}
                  onSwitchAccount={openLoginModal}
                />
              ) : (
                <AuditView />
              )
            )}

            {activeModule === 'settings' && (
              isEmployeeOnly ? (
                <AccessRestrictedCard
                  title="Configurações & Administração Bloqueadas"
                  description="As preferências de empresa, tabelas de remuneração, departamentos e gestão de utilizadores necessitam de privilégios de Administrador com palavra-passe."
                  onGoBack={() => handleNavigate('dashboard')}
                  onSwitchAccount={openLoginModal}
                />
              ) : (
                <SettingsView initialSubModule={activeSubModule} />
              )
            )}
          </div>
        </main>
      </div>
    </div>

    {/* Global Search Modal */}
    <GlobalSearchModal
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      onSelectResult={handleSelectSearchResult}
    />

    {/* Login / Authentication & Security Gate Modal */}
    <LoginModal
      isOpen={isLocked || isLoginModalOpen}
      onClose={closeLoginModal}
    />

    {/* Toast Notification Stack */}
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-3 p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  </>
);
};

export default function App() {
  return (
    <CompanyProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </CompanyProvider>
  );
}
