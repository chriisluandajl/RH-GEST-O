import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  FileDown,
  Printer,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { Vacation, Employee } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { Modal } from '../common/Modal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToExcel, formatDate, printElement } from '../../utils/exportUtils.ts';

interface VacationsViewProps {
  initialSubModule?: string;
  initialEmployeeId?: string;
}

export const VacationsView: React.FC<VacationsViewProps> = ({
  initialSubModule,
  initialEmployeeId,
}) => {
  const { user, hasPermission, addToast, isEmployeeOnly, currentEmployee } = useAuth();
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'TODOS' | 'APROVADOS' | 'PENDENTES' | 'EM_GOZO'>('TODOS');

  // New Vacation Modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newVacation, setNewVacation] = useState({
    employeeId: initialEmployeeId || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    daysCount: 15,
    type: 'FERIAS_ANUAIS',
    notes: '',
  });

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vList, eList] = await Promise.all([api.getVacations(), api.getEmployees()]);
      setVacations(vList);
      setEmployees(eList);
    } catch (err) {
      console.error(err);
      addToast('Erro ao carregar férias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialSubModule === 'marcar' || initialEmployeeId) {
      if (initialEmployeeId) {
        setNewVacation((prev) => ({ ...prev, employeeId: initialEmployeeId }));
      }
      setIsNewOpen(true);
    } else if (initialSubModule === 'aprovadas') {
      setTab('APROVADOS');
    } else if (initialSubModule === 'pendentes') {
      setTab('PENDENTES');
    } else if (initialSubModule === 'em-gozo') {
      setTab('EM_GOZO');
    }
  }, [initialSubModule, initialEmployeeId]);

  // Recalculate days count when dates change
  const handleDateChange = (start: string, end: string) => {
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
      setNewVacation((prev) => ({
        ...prev,
        startDate: start,
        endDate: end,
        daysCount: diff > 0 ? diff : 1,
      }));
    } else {
      setNewVacation((prev) => ({ ...prev, startDate: start, endDate: end }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVacation.employeeId || !newVacation.startDate || !newVacation.endDate) {
      addToast('Preencha o colaborador e as datas de início e fim.', 'warning');
      return;
    }

    try {
      await api.createVacation(newVacation as any);
      addToast('Pedido de férias registado!', 'success');
      setIsNewOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao marcar férias.', 'error');
    }
  };

  const handleApprove = async (vac: Vacation) => {
    try {
      await api.approveVacation(vac.id);
      addToast(`Férias de ${vac.employeeName} aprovadas!`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao aprovar férias.', 'error');
    }
  };

  const handleReject = async (vac: Vacation) => {
    try {
      await api.rejectVacation(vac.id, 'Indeferido por conveniência de serviço');
      addToast(`Férias de ${vac.employeeName} rejeitadas.`, 'info');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao rejeitar férias.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!vacationToDelete) return;
    try {
      await api.deleteVacation(vacationToDelete.id);
      addToast('Registo de férias eliminado.', 'info');
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao eliminar férias.', 'error');
    }
  };

  const handleExportExcel = () => {
    const data = filteredVacations.map((v) => ({
      Colaborador: v.employeeName,
      Código: v.employeeCode,
      Departamento: v.departmentName,
      Tipo: v.typeName,
      'Data Início': v.startDate,
      'Data Fim': v.endDate,
      'Dias Gozados': v.daysCount,
      Status: v.status,
      'Aprovado Por': v.approvedBy || '-',
    }));
    exportToExcel(data, `Mapa_Ferias_${new Date().toISOString().split('T')[0]}`);
  };

  const filteredVacations = vacations.filter((v) => {
    // Sigilo: Colaborador só visualiza as suas próprias férias
    if (isEmployeeOnly) {
      const myId = currentEmployee?.id || user?.employeeId;
      const myCode = currentEmployee?.code || user?.employeeCode;
      if (v.employeeId !== myId && v.employeeCode !== myCode) return false;
    }

    if (tab === 'APROVADOS' && v.status !== 'APROVADA' && v.status !== 'EM_CURSO') return false;
    if (tab === 'PENDENTES' && v.status !== 'PENDENTE') return false;
    if (tab === 'EM_GOZO' && v.status !== 'EM_CURSO') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const mEmp = v.employeeName.toLowerCase().includes(q);
      const mCode = v.employeeCode.toLowerCase().includes(q);
      const mDept = v.departmentName.toLowerCase().includes(q);
      return mEmp || mCode || mDept;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Controlo e Mapa de Férias
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold border border-cyan-200">
              {filteredVacations.length} Registos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Planeamento de períodos de descanso anual, aprovações de RH e mapa de ausências regulamentares.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={() => printElement('vacations-table-container', 'Mapa de Férias')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Mapa
          </button>
          {hasPermission('canManageVacations') && (
            <button
              onClick={() => setIsNewOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Marcar Férias
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setTab('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab === 'TODOS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({vacations.length})
            </button>
            <button
              onClick={() => setTab('APROVADOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab === 'APROVADOS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Aprovados ({vacations.filter((v) => v.status === 'APROVADA' || v.status === 'EM_CURSO').length})
            </button>
            <button
              onClick={() => setTab('EM_GOZO')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab === 'EM_GOZO' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Em Gozo Agora ({vacations.filter((v) => v.status === 'EM_CURSO').length})
            </button>
            <button
              onClick={() => setTab('PENDENTES')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab === 'PENDENTES' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pendentes ({vacations.filter((v) => v.status === 'PENDENTE').length})
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por colaborador, código ou departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Main Table */}
      <div id="vacations-table-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Colaborador</th>
                <th className="py-3.5 px-4">Departamento</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Período de Gozo</th>
                <th className="py-3.5 px-4">Dias Úteis</th>
                <th className="py-3.5 px-4">Aprovação</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    A carregar mapa de férias...
                  </td>
                </tr>
              ) : filteredVacations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum pedido de férias encontrado.
                  </td>
                </tr>
              ) : (
                filteredVacations.map((vac) => (
                  <tr key={vac.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Colaborador */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{vac.employeeName}</div>
                      <div className="text-[11px] text-slate-400">{vac.employeeCode}</div>
                    </td>

                    {/* Departamento */}
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {vac.departmentName}
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {vac.typeName}
                    </td>

                    {/* Período */}
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {formatDate(vac.startDate)} <span className="text-slate-400">até</span>{' '}
                      {formatDate(vac.endDate)}
                    </td>

                    {/* Dias */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {vac.daysCount} dias
                    </td>

                    {/* Aprovação */}
                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      {vac.approvedBy ? (
                        <span className="text-emerald-700 font-semibold">
                          Por: {vac.approvedBy}
                        </span>
                      ) : (
                        <span className="text-slate-400">Aguardando Direção</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={vac.status} type="vacation" />
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        {vac.status === 'PENDENTE' && hasPermission('canManageVacations') && (
                          <>
                            <button
                              onClick={() => handleApprove(vac)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Aprovar Pedido"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(vac)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Rejeitar Pedido"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {hasPermission('canManageVacations') && (
                          <button
                            onClick={() => {
                              setVacationToDelete(vac);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar"
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

      {/* Modal: Marcar Férias */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Marcar Férias de Colaborador"
        subtitle="Registe o agendamento de descanso e contagem de dias úteis"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Confirmar Agendamento
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Colaborador <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={newVacation.employeeId}
              onChange={(e) => setNewVacation((prev) => ({ ...prev, employeeId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="">Selecione o colaborador...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.code}) — {e.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Ausência</label>
              <select
                value={newVacation.type}
                onChange={(e) => setNewVacation((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FERIAS_ANUAIS">Férias Anuais Legais (22 dias)</option>
                <option value="LICENCA_MATERNIDADE">Licença de Maternidade</option>
                <option value="LICENCA_PATERNIDADE">Licença de Paternidade</option>
                <option value="LICENCA_SEM_VENCIMENTO">Licença Sem Vencimento</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total de Dias</label>
              <input
                type="number"
                min="1"
                value={newVacation.daysCount}
                onChange={(e) =>
                  setNewVacation((prev) => ({ ...prev, daysCount: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data Início</label>
              <input
                type="date"
                required
                value={newVacation.startDate}
                onChange={(e) => handleDateChange(e.target.value, newVacation.endDate)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data Fim</label>
              <input
                type="date"
                required
                value={newVacation.endDate}
                onChange={(e) => handleDateChange(newVacation.startDate, e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observações do Pedido</label>
            <textarea
              rows={2}
              value={newVacation.notes}
              onChange={(e) => setNewVacation((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Período de transição, responsável substituto..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Registo de Férias"
        message={`Deseja eliminar este agendamento de férias de ${vacationToDelete?.employeeName}?`}
        confirmText="Sim, Eliminar"
        isDestructive
      />
    </div>
  );
};
