import React, { useState, useEffect } from 'react';
import {
  UserX,
  Plus,
  FileDown,
  Printer,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  Trash2,
} from 'lucide-react';
import { Absence, Employee } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { Modal } from '../common/Modal.tsx';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToExcel, formatCurrency, formatDate, printElement } from '../../utils/exportUtils.ts';

interface AbsencesViewProps {
  initialSubModule?: string;
  initialEmployeeId?: string;
}

export const AbsencesView: React.FC<AbsencesViewProps> = ({
  initialSubModule,
  initialEmployeeId,
}) => {
  const { visual } = useCompany();
  const { hasPermission, addToast, isEmployeeOnly, currentEmployee, user } = useAuth();

  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'TODAS' | 'JUSTIFICADAS' | 'INJUSTIFICADAS'>('TODAS');

  // New Absence Modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newAbsence, setNewAbsence] = useState({
    employeeId: initialEmployeeId || '',
    date: new Date().toISOString().split('T')[0],
    type: 'INJUSTIFICADA',
    reason: '',
    hours: 8,
    isJustified: false,
    deductFromSalary: true,
  });

  // Justify Modal
  const [isJustifyOpen, setIsJustifyOpen] = useState(false);
  const [absenceToJustify, setAbsenceToJustify] = useState<Absence | null>(null);
  const [proofNote, setProofNote] = useState('');

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<Absence | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aList, eList] = await Promise.all([api.getAbsences(), api.getEmployees()]);
      setAbsences(aList);
      setEmployees(eList);
    } catch (err) {
      console.error(err);
      addToast('Erro ao carregar faltas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialSubModule === 'registar' || initialEmployeeId) {
      if (initialEmployeeId) {
        setNewAbsence((prev) => ({ ...prev, employeeId: initialEmployeeId }));
      }
      setIsNewOpen(true);
    } else if (initialSubModule === 'justificadas') {
      setTab('JUSTIFICADAS');
    } else if (initialSubModule === 'injustificadas') {
      setTab('INJUSTIFICADAS');
    }
  }, [initialSubModule, initialEmployeeId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAbsence.employeeId || !newAbsence.date || !newAbsence.reason) {
      addToast('Preencha o colaborador, a data e o motivo.', 'warning');
      return;
    }

    try {
      await api.createAbsence({
        ...newAbsence,
        isJustified: newAbsence.type === 'JUSTIFICADA' || newAbsence.isJustified,
        deductFromSalary:
          newAbsence.type === 'INJUSTIFICADA' ? newAbsence.deductFromSalary : false,
      } as any);
      addToast('Falta registada no sistema!', 'success');
      setIsNewOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao registar falta.', 'error');
    }
  };

  const handleJustify = async () => {
    if (!absenceToJustify) return;
    try {
      await api.justifyAbsence(
        absenceToJustify.id,
        proofNote || 'Atestado médico/comprovativo aceite pela Direção de RH.'
      );
      addToast(`Falta de ${absenceToJustify.employeeName} justificada!`, 'success');
      setIsJustifyOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao justificar falta.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!absenceToDelete) return;
    try {
      await api.deleteAbsence(absenceToDelete.id);
      addToast('Registo de falta eliminado.', 'info');
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao eliminar falta.', 'error');
    }
  };

  const handleExportExcel = () => {
    const data = filteredAbsences.map((a) => ({
      Colaborador: a.employeeName,
      Código: a.employeeCode,
      Departamento: a.departmentName,
      Data: a.date,
      Tipo: a.typeName,
      Horas: a.hours,
      Motivo: a.reason,
      'Justificada?': a.isJustified ? 'Sim' : 'Não',
      'Desconto Salarial': a.deductFromSalary ? 'Sim' : 'Não',
    }));
    exportToExcel(data, `Registo_Faltas_${new Date().toISOString().split('T')[0]}`);
  };

  const filteredAbsences = absences.filter((a) => {
    // Sigilo: Colaborador só visualiza as suas próprias faltas
    if (isEmployeeOnly) {
      const myId = currentEmployee?.id || user?.employeeId;
      const myCode = currentEmployee?.code || user?.employeeCode;
      if (a.employeeId !== myId && a.employeeCode !== myCode) return false;
    }

    if (tab === 'JUSTIFICADAS' && !a.isJustified) return false;
    if (tab === 'INJUSTIFICADAS' && a.isJustified) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const mEmp = a.employeeName.toLowerCase().includes(q);
      const mCode = a.employeeCode.toLowerCase().includes(q);
      const mReason = a.reason.toLowerCase().includes(q);
      const mDept = a.departmentName.toLowerCase().includes(q);
      return mEmp || mCode || mReason || mDept;
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
              Registo de Faltas e Ausências
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              {filteredAbsences.length} Ocorrências
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controlo de assiduidade, justificação com atestados médicos e impacto em descontos no processamento salarial.
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
            onClick={() => printElement('absences-table-container', 'Registo de Faltas')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
          {hasPermission('canManageAbsences') && (
            <button
              onClick={() => setIsNewOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Registar Falta
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setTab('TODAS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab === 'TODAS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas ({absences.length})
            </button>
            <button
              onClick={() => setTab('JUSTIFICADAS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab === 'JUSTIFICADAS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Justificadas ({absences.filter((a) => a.isJustified).length})
            </button>
            <button
              onClick={() => setTab('INJUSTIFICADAS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab === 'INJUSTIFICADAS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Injustificadas ({absences.filter((a) => !a.isJustified).length})
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por colaborador, motivo ou departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Main Table */}
      <div id="absences-table-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Colaborador</th>
                <th className="py-3.5 px-4">Data da Ocorrência</th>
                <th className="py-3.5 px-4">Duração</th>
                <th className="py-3.5 px-4">Motivo Apresentado</th>
                <th className="py-3.5 px-4">Dedução Salarial</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    A carregar registo de faltas...
                  </td>
                </tr>
              ) : filteredAbsences.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhuma falta registada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredAbsences.map((abs) => (
                  <tr key={abs.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Colaborador */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{abs.employeeName}</div>
                      <div className="text-[11px] text-slate-400">
                        {abs.employeeCode} • {abs.departmentName}
                      </div>
                    </td>

                    {/* Data */}
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {formatDate(abs.date)}
                    </td>

                    {/* Duração */}
                    <td className="py-3 px-4 text-slate-700">
                      {abs.hours} {abs.hours === 8 ? 'horas (1 dia)' : 'horas'}
                    </td>

                    {/* Motivo */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{abs.reason}</span>
                      {abs.documentProofName && (
                        <span className="text-[11px] text-blue-600 block">
                          Comprovativo: {abs.documentProofName}
                        </span>
                      )}
                    </td>

                    {/* Dedução Salarial */}
                    <td className="py-3 px-4">
                      {abs.deductFromSalary ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Sim (Desconta no Vencimento)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[11px]">Sem desconto</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={abs.isJustified ? 'JUSTIFICADA' : 'INJUSTIFICADA'}
                        type="absence"
                      />
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        {!abs.isJustified && hasPermission('canManageAbsences') && (
                          <button
                            onClick={() => {
                              setAbsenceToJustify(abs);
                              setProofNote('');
                              setIsJustifyOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Justificar
                          </button>
                        )}
                        {hasPermission('canManageAbsences') && (
                          <button
                            onClick={() => {
                              setAbsenceToDelete(abs);
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

      {/* Modal: Registar Falta */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Registar Falta / Ausência de Colaborador"
        subtitle="Controlo de ponto e imputação de faltas para processamento salarial"
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
              Registar Falta
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
              value={newAbsence.employeeId}
              onChange={(e) => setNewAbsence((prev) => ({ ...prev, employeeId: e.target.value }))}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data da Falta</label>
              <input
                type="date"
                required
                value={newAbsence.date}
                onChange={(e) => setNewAbsence((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo Inicial</label>
              <select
                value={newAbsence.type}
                onChange={(e) =>
                  setNewAbsence((prev) => ({
                    ...prev,
                    type: e.target.value,
                    deductFromSalary: e.target.value === 'INJUSTIFICADA',
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INJUSTIFICADA">Injustificada</option>
                <option value="JUSTIFICADA">Justificada</option>
                <option value="MEDICA">Médica</option>
                <option value="LUTO">Luto Familiar</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Horas Ausentes</label>
              <input
                type="number"
                min="1"
                max="24"
                value={newAbsence.hours}
                onChange={(e) =>
                  setNewAbsence((prev) => ({ ...prev, hours: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo ou Descrição <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Não compareceu ao posto de trabalho sem aviso prévio"
              value={newAbsence.reason}
              onChange={(e) => setNewAbsence((prev) => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <input
              type="checkbox"
              id="deductSalary"
              checked={newAbsence.deductFromSalary}
              onChange={(e) =>
                setNewAbsence((prev) => ({ ...prev, deductFromSalary: e.target.checked }))
              }
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="deductSalary" className="text-slate-800 font-semibold cursor-pointer">
              Efetuar desconto proporcional no salário mensal deste colaborador
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal: Justificar Falta */}
      <Modal
        isOpen={isJustifyOpen}
        onClose={() => setIsJustifyOpen(false)}
        title={`Justificar Falta: ${absenceToJustify?.employeeName}`}
        subtitle={`Data da Ocorrência: ${absenceToJustify ? formatDate(absenceToJustify.date) : ''}`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsJustifyOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleJustify}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              Validar Justificação
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Ao justificar esta ausência, o status será alterado para <strong>JUSTIFICADA</strong> e a dedução salarial será anulada.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Documento Comprovativo / Parecer de RH
            </label>
            <textarea
              rows={3}
              required
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="Ex: Apresentou atestado médico do Centro Hospitalar emitido pelo Dr. António..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Falta"
        message={`Deseja eliminar este registo de falta de ${absenceToDelete?.employeeName}?`}
        confirmText="Sim, Eliminar"
        isDestructive
      />
    </div>
  );
};
