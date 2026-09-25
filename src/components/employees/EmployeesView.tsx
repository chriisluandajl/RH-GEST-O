import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  FileDown,
  Printer,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Building,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Employee, Department } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { EmployeeFormModal } from './EmployeeFormModal.tsx';
import { EmployeeProfileModal } from './EmployeeProfileModal.tsx';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToExcel, formatCurrency, formatDate, printElement } from '../../utils/exportUtils.ts';

interface EmployeesViewProps {
  initialSubModule?: string;
  initialSelectedId?: string;
  onOpenNewContract?: (employeeId: string) => void;
  onOpenNewVacation?: (employeeId: string) => void;
  onOpenNewAbsence?: (employeeId: string) => void;
  onOpenNewDocument?: (employeeId: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  initialSubModule,
  initialSelectedId,
  onOpenNewContract,
  onOpenNewVacation,
  onOpenNewAbsence,
  onOpenNewDocument,
}) => {
  const { visual } = useCompany();
  const { hasPermission, addToast, isEmployeeOnly, currentEmployee, user } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [statusTab, setStatusTab] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS' | 'FERIAS'>('TODOS');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Handle initial subModule or selected employee ID
  useEffect(() => {
    if (initialSubModule === 'novo') {
      setEmployeeToEdit(null);
      setIsFormOpen(true);
    } else if (initialSubModule === 'ativos') {
      setStatusTab('ATIVOS');
    } else if (initialSubModule === 'inativos') {
      setStatusTab('INATIVOS');
    }
    if (initialSelectedId) {
      setProfileEmployeeId(initialSelectedId);
    }
  }, [initialSubModule, initialSelectedId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empList, deptList] = await Promise.all([
        api.getEmployees(),
        api.getDepartments(),
      ]);
      setEmployees(empList);
      setDepartments(deptList);
    } catch (err) {
      console.error(err);
      addToast('Erro ao carregar colaboradores.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    // Se for colaborador em modo individual, só pode visualizar a sua própria ficha (sigilo absoluto)
    if (isEmployeeOnly) {
      const myId = currentEmployee?.id || user?.employeeId;
      const myCode = currentEmployee?.code || user?.employeeCode;
      if (emp.id !== myId && emp.code !== myCode) return false;
    }

    // Status tab filter
    if (statusTab === 'ATIVOS' && emp.status !== 'ATIVO') return false;
    if (statusTab === 'INATIVOS' && emp.status !== 'INATIVO' && emp.status !== 'DESLIGADO' && emp.status !== 'SUSPENSO') return false;
    if (statusTab === 'FERIAS' && emp.status !== 'EM_FERIAS') return false;

    // Department filter
    if (selectedDept && emp.departmentId !== selectedDept && emp.departmentName !== selectedDept) {
      return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = emp.fullName.toLowerCase().includes(q);
      const matchCode = emp.code.toLowerCase().includes(q);
      const matchId = emp.idNumber.toLowerCase().includes(q);
      const matchNif = emp.nif.toLowerCase().includes(q);
      const matchPhone = emp.phone.includes(q);
      const matchDept = emp.departmentName.toLowerCase().includes(q);
      const matchPos = emp.positionName.toLowerCase().includes(q);
      return matchName || matchCode || matchId || matchNif || matchPhone || matchDept || matchPos;
    }

    return true;
  });

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await api.deleteEmployee(employeeToDelete.id);
      addToast(`Funcionário ${employeeToDelete.fullName} eliminado com sucesso.`, 'success');
      setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
    } catch (err: any) {
      addToast(err.message || 'Falha ao eliminar funcionário.', 'error');
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredEmployees.map((e) => ({
      Código: e.code,
      'Nome Completo': e.fullName,
      'BI / Passaporte': e.idNumber,
      NIF: e.nif,
      Departamento: e.departmentName,
      Cargo: e.positionName,
      'Data de Admissão': e.admissionDate,
      'Salário Base': e.baseSalary,
      Status: e.status,
      Telefone: e.phone,
      IBAN: e.iban,
      Banco: e.bankName,
    }));
    exportToExcel(exportData, `Lista_Funcionarios_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Primary Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Funcionários</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {filteredEmployees.length} Registados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro de colaboradores, dados pessoais, cargos, vencimentos e histórico contratual.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            title="Exportar para Excel"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => printElement('employees-table-container', 'Lista de Funcionários')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            title="Imprimir listagem"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          {hasPermission('canCreateEmployees') && (
            <button
              onClick={() => {
                setEmployeeToEdit(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Funcionário
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setStatusTab('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusTab === 'TODOS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({employees.length})
            </button>
            <button
              onClick={() => setStatusTab('ATIVOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusTab === 'ATIVOS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ativos ({employees.filter((e) => e.status === 'ATIVO').length})
            </button>
            <button
              onClick={() => setStatusTab('FERIAS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusTab === 'FERIAS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Em Férias ({employees.filter((e) => e.status === 'EM_FERIAS').length})
            </button>
            <button
              onClick={() => setStatusTab('INATIVOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusTab === 'INATIVOS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Inativos ({employees.filter((e) => e.status === 'INATIVO' || e.status === 'DESLIGADO' || e.status === 'SUSPENSO').length})
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar por nome, código, BI/Passaporte, NIF, telefone ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            >
              <option value="">Todos os Departamentos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div id="employees-table-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Colaborador</th>
                <th className="py-3.5 px-4">Código / BI</th>
                <th className="py-3.5 px-4">Departamento & Cargo</th>
                <th className="py-3.5 px-4">Admissão</th>
                <th className="py-3.5 px-4">Salário Base</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    A carregar lista de funcionários...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum colaborador encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Colaborador */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.photoUrl}
                          alt={emp.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <button
                            onClick={() => setProfileEmployeeId(emp.id)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                          >
                            {emp.fullName}
                          </button>
                          <div className="text-[11px] text-slate-400">{emp.email || emp.phone}</div>
                        </div>
                      </div>
                    </td>

                    {/* Código / BI */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-800 block">{emp.code}</span>
                      <span className="font-mono text-[11px] text-slate-400 block">{emp.idNumber}</span>
                    </td>

                    {/* Departamento & Cargo */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{emp.departmentName}</span>
                      <span className="text-[11px] text-slate-500 block">{emp.positionName}</span>
                    </td>

                    {/* Admissão */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {formatDate(emp.admissionDate)}
                    </td>

                    {/* Salário Base */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-700">
                        {formatCurrency(emp.baseSalary, visual.currencySymbol)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={emp.status} type="employee" />
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setProfileEmployeeId(emp.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Visualizar Ficha Completa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission('canEditEmployees') && (
                          <button
                            onClick={() => {
                              setEmployeeToEdit(emp);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Editar Dados"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('canDeleteEmployees') && (
                          <button
                            onClick={() => {
                              setEmployeeToDelete(emp);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar Funcionário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal for Creating & Editing */}
      <EmployeeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        employeeToEdit={employeeToEdit}
        onSaved={(savedEmp) => {
          loadData();
          addToast(
            employeeToEdit
              ? `Funcionário ${savedEmp.fullName} atualizado.`
              : `Funcionário ${savedEmp.fullName} cadastrado com sucesso!`,
            'success'
          );
        }}
      />

      {/* Detailed 9-Tab Profile Modal */}
      <EmployeeProfileModal
        isOpen={Boolean(profileEmployeeId)}
        onClose={() => setProfileEmployeeId(null)}
        employeeId={profileEmployeeId}
        onEdit={(emp) => {
          setEmployeeToEdit(emp);
          setIsFormOpen(true);
        }}
        onOpenNewContract={onOpenNewContract}
        onOpenNewVacation={onOpenNewVacation}
        onOpenNewAbsence={onOpenNewAbsence}
        onOpenNewDocument={onOpenNewDocument}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Funcionário"
        message={`Tem certeza que deseja eliminar o colaborador ${employeeToDelete?.fullName} (${employeeToDelete?.code})? Esta ação é irreversível e removerá o histórico cadastral associado.`}
        confirmText="Sim, Eliminar"
        isDestructive
      />
    </div>
  );
};
