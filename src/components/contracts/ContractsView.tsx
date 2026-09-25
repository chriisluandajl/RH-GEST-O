import React, { useState, useEffect } from 'react';
import {
  FileSignature,
  Plus,
  FileDown,
  Printer,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Copy,
  Ban,
  Trash2,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Contract, Employee } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { Modal } from '../common/Modal.tsx';
import { ContractPrintModal } from './ContractPrintModal.tsx';
import { ContractTemplateModal } from './ContractTemplateModal.tsx';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToExcel, formatCurrency, formatDate, printElement } from '../../utils/exportUtils.ts';

interface ContractsViewProps {
  initialSubModule?: string;
  initialSelectedId?: string;
  initialEmployeeId?: string;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  initialSubModule,
  initialSelectedId,
  initialEmployeeId,
}) => {
  const { visual } = useCompany();
  const { hasPermission, addToast, isEmployeeOnly, currentEmployee, user } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [search, setSearch] = useState('');
  const [contractTab, setContractTab] = useState<'TODOS' | 'ATIVOS' | 'A_TERMINAR' | 'TERMINADOS'>(
    'TODOS'
  );

  // Modals
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [contractToRenew, setContractToRenew] = useState<Contract | null>(null);
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewSalary, setRenewSalary] = useState('');
  const [renewNotes, setRenewNotes] = useState('');

  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [contractToTerminate, setContractToTerminate] = useState<Contract | null>(null);
  const [terminateReason, setTerminateReason] = useState('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // New Contract Form State
  const [newContractData, setNewContractData] = useState({
    employeeId: initialEmployeeId || '',
    type: 'TEMPO_INDETERMINADO',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    durationMonths: 12,
    baseSalary: 450000,
    isSigned: false,
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, eList] = await Promise.all([api.getContracts(), api.getEmployees()]);
      setContracts(cList);
      setEmployees(eList);
      if (initialSelectedId) {
        const found = cList.find((c) => c.id === initialSelectedId);
        if (found) setViewingContract(found);
      }
    } catch (err) {
      console.error(err);
      addToast('Erro ao carregar contratos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialSubModule === 'novo' || initialEmployeeId) {
      if (initialEmployeeId) {
        const emp = employees.find((e) => e.id === initialEmployeeId);
        if (emp) {
          setNewContractData((prev) => ({
            ...prev,
            employeeId: emp.id,
            baseSalary: emp.baseSalary,
          }));
        }
      }
      setIsNewContractOpen(true);
    } else if (initialSubModule === 'ativos') {
      setContractTab('ATIVOS');
    } else if (initialSubModule === 'a-terminar') {
      setContractTab('A_TERMINAR');
    } else if (initialSubModule === 'terminados') {
      setContractTab('TERMINADOS');
    } else if (initialSubModule === 'modelos') {
      setIsTemplateModalOpen(true);
    }
  }, [initialSubModule, initialEmployeeId, employees]);

  // Calculate days remaining helper
  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const now = new Date('2026-09-22T08:00:00Z');
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
  };

  // Filtered contracts
  const filteredContracts = contracts.filter((c) => {
    // Sigilo: Colaborador só visualiza os seus próprios contratos de trabalho
    if (isEmployeeOnly) {
      const myId = currentEmployee?.id || user?.employeeId;
      const myCode = currentEmployee?.code || user?.employeeCode;
      if (c.employeeId !== myId && c.employeeCode !== myCode) return false;
    }

    const days = getDaysRemaining(c.endDate);

    if (contractTab === 'ATIVOS' && c.status !== 'ATIVO') return false;
    if (contractTab === 'TERMINADOS' && c.status !== 'TERMINADO' && c.status !== 'CANCELADO') return false;
    if (contractTab === 'A_TERMINAR') {
      if (c.status === 'TERMINADO' || c.status === 'CANCELADO') return false;
      if (days === null || days < 0 || days > 30) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = c.contractNumber.toLowerCase().includes(q);
      const matchName = c.employeeName.toLowerCase().includes(q);
      const matchCode = c.employeeCode.toLowerCase().includes(q);
      const matchDept = c.departmentName.toLowerCase().includes(q);
      const matchType = c.typeName.toLowerCase().includes(q);
      return matchNum || matchName || matchCode || matchDept || matchType;
    }

    return true;
  });

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractData.employeeId || !newContractData.startDate) {
      addToast('Selecione o colaborador e a data de início.', 'warning');
      return;
    }

    try {
      const created = await api.createContract(newContractData as any);
      addToast(`Contrato ${created.contractNumber} criado com sucesso.`, 'success');
      setIsNewContractOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao criar contrato.', 'error');
    }
  };

  const handleRenew = async () => {
    if (!contractToRenew || !renewEndDate) return;
    try {
      await api.renewContract(contractToRenew.id, {
        newEndDate: renewEndDate,
        newSalary: renewSalary ? Number(renewSalary) : undefined,
        notes: renewNotes,
      });
      addToast(`Contrato ${contractToRenew.contractNumber} renovado até ${formatDate(renewEndDate)}.`, 'success');
      setIsRenewModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao renovar contrato.', 'error');
    }
  };

  const handleTerminate = async () => {
    if (!contractToTerminate) return;
    try {
      await api.terminateContract(contractToTerminate.id, { reason: terminateReason });
      addToast(`Contrato ${contractToTerminate.contractNumber} encerrado.`, 'info');
      setIsTerminateOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao encerrar contrato.', 'error');
    }
  };

  const handleDuplicate = async (contract: Contract) => {
    try {
      const dup = await api.duplicateContract(contract.id);
      addToast(`Contrato duplicado com o número ${dup.contractNumber}.`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao duplicar contrato.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;
    try {
      await api.deleteContract(contractToDelete.id);
      addToast(`Contrato ${contractToDelete.contractNumber} eliminado.`, 'info');
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao eliminar contrato.', 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredContracts.map((c) => ({
      'Nº Contrato': c.contractNumber,
      'Funcionário': c.employeeName,
      'Código': c.employeeCode,
      'Departamento': c.departmentName,
      'Regime': c.typeName,
      'Data Início': c.startDate,
      'Data Fim': c.endDate || 'Indeterminado',
      'Salário': c.baseSalary,
      'Assinado': c.isSigned ? 'Sim' : 'Não',
      'Status': c.status,
    }));
    exportToExcel(exportData, `Contratos_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Contratos de Trabalho</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              {filteredContracts.length} Registados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Criação, renovação, geração de minutas padronizadas, prazos de vencimento e impressão.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Modelos de Contratos
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={() => printElement('contracts-table-container', 'Lista de Contratos')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
          {hasPermission('canCreateContracts') && (
            <button
              onClick={() => setIsNewContractOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Contrato
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setContractTab('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                contractTab === 'TODOS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({contracts.length})
            </button>
            <button
              onClick={() => setContractTab('ATIVOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                contractTab === 'ATIVOS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ativos ({contracts.filter((c) => c.status === 'ATIVO').length})
            </button>
            <button
              onClick={() => setContractTab('A_TERMINAR')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                contractTab === 'A_TERMINAR'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              A Terminar (30 dias)
            </button>
            <button
              onClick={() => setContractTab('TERMINADOS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                contractTab === 'TERMINADOS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Terminados ({contracts.filter((c) => c.status === 'TERMINADO' || c.status === 'CANCELADO').length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por número de contrato, funcionário, departamento ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Main Table */}
      <div id="contracts-table-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nº Contrato</th>
                <th className="py-3.5 px-4">Funcionário</th>
                <th className="py-3.5 px-4">Regime / Tipo</th>
                <th className="py-3.5 px-4">Vigência (Início → Término)</th>
                <th className="py-3.5 px-4">Salário</th>
                <th className="py-3.5 px-4">Prazo / Alerta</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    A carregar contratos...
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((cnt) => {
                  const daysLeft = getDaysRemaining(cnt.endDate);
                  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                  const isExpired = daysLeft !== null && daysLeft < 0;

                  return (
                    <tr key={cnt.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Nº Contrato */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setViewingContract(cnt)}
                          className="font-mono font-bold text-slate-900 hover:text-blue-600 transition-colors block text-left"
                        >
                          {cnt.contractNumber}
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {cnt.isSigned ? 'Assinado' : 'Minuta pendente'}
                        </span>
                      </td>

                      {/* Funcionário */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{cnt.employeeName}</div>
                        <div className="text-[11px] text-slate-500">
                          {cnt.employeeCode} • {cnt.departmentName}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 block">{cnt.typeName}</span>
                      </td>

                      {/* Vigência */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{formatDate(cnt.startDate)}</span>
                        <span className="text-[11px] text-slate-400 block">
                          até {cnt.endDate ? formatDate(cnt.endDate) : 'Indeterminado'}
                        </span>
                      </td>

                      {/* Salário */}
                      <td className="py-3 px-4 font-bold text-blue-700">
                        {formatCurrency(cnt.baseSalary, visual.currencySymbol)}
                      </td>

                      {/* Prazo Restante */}
                      <td className="py-3 px-4">
                        {daysLeft === null ? (
                          <span className="text-slate-400 font-medium">Sem termo</span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                            Expirou há {Math.abs(daysLeft)} dias
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                            Faltam {daysLeft} dias
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">{daysLeft} dias restantes</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={cnt.status} type="contract" />
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingContract(cnt)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar Minuta / Imprimir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {hasPermission('canEditContracts') && (
                            <button
                              onClick={() => {
                                setContractToRenew(cnt);
                                setRenewEndDate(cnt.endDate || '');
                                setRenewSalary(String(cnt.baseSalary));
                                setIsRenewModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Renovar Contrato"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(cnt)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Duplicar Minuta"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {cnt.status === 'ATIVO' && hasPermission('canEditContracts') && (
                            <button
                              onClick={() => {
                                setContractToTerminate(cnt);
                                setIsTerminateOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Encerrar Contrato"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('canDeleteContracts') && (
                            <button
                              onClick={() => {
                                setContractToDelete(cnt);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar Contrato"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Contrato */}
      <Modal
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        title="Criar Novo Contrato de Trabalho"
        subtitle="Registe os termos, remuneração e datas do vínculo contratual"
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsNewContractOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateContract}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Criar Contrato
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateContract} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Colaborador <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={newContractData.employeeId}
              onChange={(e) => {
                const emp = employees.find((x) => x.id === e.target.value);
                setNewContractData((prev) => ({
                  ...prev,
                  employeeId: e.target.value,
                  baseSalary: emp ? emp.baseSalary : prev.baseSalary,
                }));
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="">Selecione o colaborador...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.code}) — {e.positionName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Contrato</label>
            <select
              value={newContractData.type}
              onChange={(e) => setNewContractData((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TEMPO_INDETERMINADO">Tempo Indeterminado</option>
              <option value="TERMO_CERTO">Termo Certo</option>
              <option value="TERMO_INCERTO">Termo Incerto</option>
              <option value="PRESTACAO_SERVICOS">Prestação de Serviços</option>
              <option value="ESTAGIO">Estágio Profissional</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Salário Base ({visual.currencySymbol})
            </label>
            <input
              type="number"
              min="0"
              step="5000"
              value={newContractData.baseSalary}
              onChange={(e) =>
                setNewContractData((prev) => ({ ...prev, baseSalary: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Data de Início</label>
            <input
              type="date"
              required
              value={newContractData.startDate}
              onChange={(e) =>
                setNewContractData((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Data de Término (se aplicável)
            </label>
            <input
              type="date"
              value={newContractData.endDate}
              onChange={(e) =>
                setNewContractData((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Observações Contratuais</label>
            <textarea
              rows={3}
              value={newContractData.notes}
              onChange={(e) =>
                setNewContractData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Cláusulas específicas, subsídios adicionais..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Renovar Contrato */}
      <Modal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        title={`Renovar Contrato: ${contractToRenew?.contractNumber}`}
        subtitle={`Funcionário: ${contractToRenew?.employeeName}`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsRenewModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRenew}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              Confirmar Renovação
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nova Data de Término <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={renewEndDate}
              onChange={(e) => setRenewEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Revisão Salarial na Renovação ({visual.currencySymbol})
            </label>
            <input
              type="number"
              value={renewSalary}
              onChange={(e) => setRenewSalary(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Aditamento / Notas</label>
            <textarea
              rows={3}
              value={renewNotes}
              onChange={(e) => setRenewNotes(e.target.value)}
              placeholder="Motivo da renovação..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Encerrar Contrato */}
      <Modal
        isOpen={isTerminateOpen}
        onClose={() => setIsTerminateOpen(false)}
        title={`Encerrar Contrato: ${contractToTerminate?.contractNumber}`}
        subtitle={`Funcionário: ${contractToTerminate?.employeeName}`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsTerminateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleTerminate}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
            >
              Encerrar Contrato
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            O status do contrato será alterado para <strong>TERMINADO</strong>. Indique o motivo da cessação:
          </p>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Motivo do Encerramento</label>
            <textarea
              rows={3}
              required
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              placeholder="Ex: Caducidade do prazo / Acordo mútuo de revogação..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>

      {/* Contract Printable Preview Modal */}
      <ContractPrintModal
        isOpen={Boolean(viewingContract)}
        onClose={() => setViewingContract(null)}
        contract={viewingContract}
        onSignedToggle={async (cid, signed) => {
          await api.updateContract(cid, {
            isSigned: signed,
            signedDate: signed ? new Date().toISOString().split('T')[0] : undefined,
          });
          loadData();
          if (viewingContract) {
            setViewingContract({ ...viewingContract, isSigned: signed });
          }
        }}
      />

      {/* Template Manager Modal */}
      <ContractTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Contrato"
        message={`Tem a certeza que deseja eliminar o contrato ${contractToDelete?.contractNumber}? Esta ação removerá a minuta e dados contratuais.`}
        confirmText="Sim, Eliminar"
        isDestructive
      />
    </div>
  );
};
