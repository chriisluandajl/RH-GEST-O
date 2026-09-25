import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import {
  Employee,
  Contract,
  DocumentItem,
  Vacation,
  Absence,
  SalaryHistory,
} from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate, printElement } from '../../utils/exportUtils.ts';
import {
  Printer,
  FileText,
  Calendar,
  UserX,
  CreditCard,
  Briefcase,
  User,
  History,
  Shield,
  Upload,
  Plus,
} from 'lucide-react';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
  onEdit: (employee: Employee) => void;
  onOpenNewContract?: (employeeId: string) => void;
  onOpenNewVacation?: (employeeId: string) => void;
  onOpenNewAbsence?: (employeeId: string) => void;
  onOpenNewDocument?: (employeeId: string) => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onEdit,
  onOpenNewContract,
  onOpenNewVacation,
  onOpenNewAbsence,
  onOpenNewDocument,
}) => {
  const { company, visual } = useCompany();
  const { addToast } = useAuth();
  const [employee, setEmployee] = useState<
    (Employee & {
      contracts: Contract[];
      documents: DocumentItem[];
      vacations: Vacation[];
      absences: Absence[];
      salaryHistory: SalaryHistory[];
    }) | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | 'pessoal'
    | 'profissional'
    | 'contrato'
    | 'documentos'
    | 'ferias'
    | 'faltas'
    | 'salarios'
    | 'historico'
    | 'observacoes'
  >('pessoal');

  const [newSalary, setNewSalary] = useState('');
  const [salaryReason, setSalaryReason] = useState('');
  const [updatingSalary, setUpdatingSalary] = useState(false);

  const fetchProfile = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await api.getEmployeeById(employeeId);
      setEmployee(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchProfile();
      setActiveTab('pessoal');
    }
  }, [isOpen, employeeId]);

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !newSalary) return;
    setUpdatingSalary(true);
    try {
      await api.updateSalary(employee.id, Number(newSalary), salaryReason);
      setNewSalary('');
      setSalaryReason('');
      await fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar salário.');
    } finally {
      setUpdatingSalary(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha do Colaborador: ${employee.fullName}`}
      subtitle={`Código: ${employee.code} • ${employee.departmentName} • ${employee.positionName}`}
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => printElement('employee-profile-print', `Ficha-${employee.code}`)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Ficha Completa
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onEdit(employee);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Editar Dados
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Profile Header Card */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <img
            src={employee.photoUrl}
            alt={employee.fullName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
          />
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                  {employee.fullName}
                  <span className="text-xs font-mono font-medium text-slate-500">
                    ({employee.code})
                  </span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {employee.positionName} • {employee.departmentName}
                </p>
              </div>
              <StatusBadge status={employee.status} type="employee" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-600 border-t border-slate-200/60 mt-2">
              <div>
                <span className="text-slate-400 block">Admissão:</span>
                <span className="font-semibold text-slate-800">{formatDate(employee.admissionDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">BI / Passaporte:</span>
                <span className="font-semibold font-mono text-slate-800">{employee.idNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Salário Base:</span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(employee.baseSalary, visual.currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Telefone:</span>
                <span className="font-semibold text-slate-800">{employee.phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* The 9 Tabs Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-semibold gap-1 overflow-x-auto pb-1">
          {[
            { id: 'pessoal', label: '1. Pessoais', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'profissional', label: '2. Profissionais', icon: <Briefcase className="w-3.5 h-3.5" /> },
            { id: 'contrato', label: `3. Contratos (${employee.contracts.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'documentos', label: `4. Documentos (${employee.documents.length})`, icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'ferias', label: `5. Férias (${employee.vacations.length})`, icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'faltas', label: `6. Faltas (${employee.absences.length})`, icon: <UserX className="w-3.5 h-3.5" /> },
            { id: 'salarios', label: '7. Salários', icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: 'historico', label: '8. Histórico', icon: <History className="w-3.5 h-3.5" /> },
            { id: 'observacoes', label: '9. Observações', icon: <FileText className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Dados Pessoais */}
        {activeTab === 'pessoal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Nome Completo</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.fullName}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Nome Abreviado</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.nickname || '-'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Género</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.gender}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Data de Nascimento</span>
              <span className="font-semibold text-slate-800 text-sm">{formatDate(employee.birthDate)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Nacionalidade</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.nationality}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Estado Civil</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.maritalStatus}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">BI / Passaporte</span>
              <span className="font-semibold font-mono text-slate-800 text-sm">{employee.idNumber}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Validade do BI</span>
              <span className="font-semibold text-slate-800 text-sm">{formatDate(employee.idExpiryDate)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">NIF</span>
              <span className="font-semibold font-mono text-slate-800 text-sm">{employee.nif}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Telefone</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.phone}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">E-mail</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.email || '-'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Localização</span>
              <span className="font-semibold text-slate-800 text-sm">
                {employee.address ? `${employee.address}, ` : ''}{employee.municipality}, {employee.province}
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Dados Profissionais */}
        {activeTab === 'profissional' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Departamento</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.departmentName}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Cargo Registado</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.positionName}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Função / Especialidade</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.jobRole || employee.positionName}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Data de Admissão</span>
              <span className="font-semibold text-slate-800 text-sm">{formatDate(employee.admissionDate)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Regime Contratual</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.contractType}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Banco para Pagamentos</span>
              <span className="font-semibold text-slate-800 text-sm">{employee.bankName || '-'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl sm:col-span-2">
              <span className="text-slate-400 block text-[11px]">IBAN Bancário</span>
              <span className="font-semibold font-mono text-slate-800 text-sm">{employee.iban || '-'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Nº Segurança Social (INSS)</span>
              <span className="font-semibold font-mono text-slate-800 text-sm">{employee.socialSecurityNumber || '-'}</span>
            </div>
          </div>
        )}

        {/* Tab 3: Contratos */}
        {activeTab === 'contrato' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Histórico de Contratos de Trabalho
              </h4>
              {onOpenNewContract && (
                <button
                  onClick={() => {
                    onOpenNewContract(employee.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Novo Contrato
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {employee.contracts.length === 0 ? (
                <div className="p-6 text-center text-slate-400">Nenhum contrato registado para este funcionário.</div>
              ) : (
                employee.contracts.map((c) => (
                  <div key={c.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {c.contractNumber}
                        <StatusBadge status={c.status} type="contract" />
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {c.typeName} • Início: {formatDate(c.startDate)} • Término: {c.endDate ? formatDate(c.endDate) : 'Indeterminado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(c.baseSalary, visual.currencySymbol)}
                      </div>
                      <span className="text-[11px] text-slate-400">{c.isSigned ? 'Assinado' : 'Pendente de assinatura'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Documentos */}
        {activeTab === 'documentos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Documentos e Anexos Digitais
              </h4>
              {onOpenNewDocument && (
                <button
                  onClick={() => {
                    onOpenNewDocument(employee.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  + Anexar Ficheiro
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {employee.documents.length === 0 ? (
                <div className="p-6 text-center text-slate-400">Nenhum documento anexado ao processo.</div>
              ) : (
                employee.documents.map((doc) => (
                  <div key={doc.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {doc.name}
                        <StatusBadge status={doc.status} type="document" />
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {doc.categoryName} • {doc.fileName} • Carregado em {formatDate(doc.uploadDate)}
                      </p>
                    </div>
                    <a
                      href={doc.fileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs transition-colors"
                    >
                      Visualizar
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Férias */}
        {activeTab === 'ferias' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registo e Histórico de Férias
              </h4>
              {onOpenNewVacation && (
                <button
                  onClick={() => {
                    onOpenNewVacation(employee.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Marcar Férias
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {employee.vacations.length === 0 ? (
                <div className="p-6 text-center text-slate-400">Nenhum pedido de férias registado.</div>
              ) : (
                employee.vacations.map((v) => (
                  <div key={v.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {v.typeName} ({v.daysCount} dias)
                        <StatusBadge status={v.status} type="vacation" />
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        De {formatDate(v.startDate)} até {formatDate(v.endDate)} {v.approvedBy ? `• Aprovado por: ${v.approvedBy}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Faltas */}
        {activeTab === 'faltas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registo de Faltas e Ausências
              </h4>
              {onOpenNewAbsence && (
                <button
                  onClick={() => {
                    onOpenNewAbsence(employee.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Registar Falta
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {employee.absences.length === 0 ? (
                <div className="p-6 text-center text-slate-400">Sem faltas registadas.</div>
              ) : (
                employee.absences.map((a) => (
                  <div key={a.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {a.typeName} • Data: {formatDate(a.date)}
                        <StatusBadge status={a.isJustified ? 'JUSTIFICADA' : 'INJUSTIFICADA'} type="absence" />
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        Motivo: {a.reason} ({a.hours} horas) {a.documentProofName ? `• Comprovativo: ${a.documentProofName}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Salários */}
        {activeTab === 'salarios' && (
          <div className="space-y-5 text-xs">
            {/* Quick Adjustment Form */}
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/70">
              <h4 className="font-bold text-blue-900 mb-2">Ajustar Salário Base</h4>
              <form onSubmit={handleUpdateSalary} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Novo Salário ({visual.currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="5000"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    placeholder="Ex: 500000"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Motivo da Alteração</label>
                  <input
                    type="text"
                    required
                    value={salaryReason}
                    onChange={(e) => setSalaryReason(e.target.value)}
                    placeholder="Ex: Promoção de mérito / Revisão anual"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={updatingSalary}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    {updatingSalary ? 'A atualizar...' : 'Confirmar Novo Salário'}
                  </button>
                </div>
              </form>
            </div>

            {/* History Table */}
            <div>
              <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2">
                Histórico de Alterações Salariais
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {employee.salaryHistory.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">Sem alterações salariais registadas até o momento.</div>
                ) : (
                  employee.salaryHistory.map((sh) => (
                    <div key={sh.id} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">
                          {formatCurrency(sh.previousSalary, visual.currencySymbol)} →{' '}
                          <span className="text-emerald-700">{formatCurrency(sh.newSalary, visual.currencySymbol)}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          {sh.reason} • Por: {sh.changedBy}
                        </p>
                      </div>
                      <span className="text-slate-400 font-medium">{formatDate(sh.changeDate)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Histórico & Auditoria */}
        {activeTab === 'historico' && (
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider">
              Linha do Tempo Cadastral
            </h4>
            <div className="space-y-2 border-l-2 border-blue-200 pl-4 ml-2">
              <div className="relative">
                <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600" />
                <p className="font-bold text-slate-800">Admissão e Contratação Inicial</p>
                <p className="text-slate-500">Admissão formal na empresa em {formatDate(employee.admissionDate)}.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-400" />
                <p className="font-bold text-slate-800">Criação do Registo Digital</p>
                <p className="text-slate-500">Cadastrado no sistema em {formatDate(employee.createdAt)}.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-400" />
                <p className="font-bold text-slate-800">Última Atualização</p>
                <p className="text-slate-500">Registo atualizado em {formatDate(employee.updatedAt)}.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: Observações */}
        {activeTab === 'observacoes' && (
          <div className="text-xs space-y-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
              {employee.notes ? employee.notes : 'Sem notas ou observações adicionais registadas.'}
            </div>
            {employee.emergencyContactName && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h5 className="font-bold text-slate-800 mb-2">Contacto de Emergência</h5>
                <p className="text-slate-600">
                  <strong>Nome:</strong> {employee.emergencyContactName} ({employee.emergencyContactRelation})
                </p>
                <p className="text-slate-600 mt-1">
                  <strong>Telefone:</strong> {employee.emergencyContactPhone || '-'}
                </p>
                <p className="text-slate-600 mt-1">
                  <strong>Endereço:</strong> {employee.emergencyContactAddress || '-'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden Printable A4 Frame for Clean Browser Printing */}
      <div id="employee-profile-print" className="hidden">
        <div style={{ padding: '24px', fontFamily: 'sans-serif', color: '#111827' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e3a8a', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a' }}>
                {company.companyName}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#4b5563' }}>
                NIF: {company.nif} • {company.address}, {company.province} • Tel: {company.phone1}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>FICHA DE CADASTRO DO FUNCIONÁRIO</h2>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>Código: {employee.code}</p>
            </div>
          </div>

          {/* Dados Principais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '12px' }}>
            <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '13px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>DADOS PESSOAIS</h3>
              <p><strong>Nome Completo:</strong> {employee.fullName}</p>
              <p><strong>BI/Passaporte:</strong> {employee.idNumber} (Val: {formatDate(employee.idExpiryDate)})</p>
              <p><strong>NIF:</strong> {employee.nif}</p>
              <p><strong>Data Nasc.:</strong> {formatDate(employee.birthDate)} ({employee.gender})</p>
              <p><strong>Estado Civil:</strong> {employee.maritalStatus}</p>
              <p><strong>Telefone:</strong> {employee.phone}</p>
              <p><strong>Morada:</strong> {employee.address || `${employee.municipality}, ${employee.province}`}</p>
            </div>

            <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '13px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>DADOS PROFISSIONAIS & CONTRATUAIS</h3>
              <p><strong>Departamento:</strong> {employee.departmentName}</p>
              <p><strong>Cargo / Função:</strong> {employee.positionName}</p>
              <p><strong>Data de Admissão:</strong> {formatDate(employee.admissionDate)}</p>
              <p><strong>Regime Contratual:</strong> {employee.contractType}</p>
              <p><strong>Salário Base:</strong> {formatCurrency(employee.baseSalary, visual.currencySymbol)}</p>
              <p><strong>Banco:</strong> {employee.bankName}</p>
              <p><strong>IBAN:</strong> {employee.iban}</p>
              <p><strong>Nº INSS:</strong> {employee.socialSecurityNumber || 'Pendente'}</p>
            </div>
          </div>

          {/* Contacto Emergência */}
          {employee.emergencyContactName && (
            <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '13px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>CONTACTO DE EMERGÊNCIA</h3>
              <p><strong>Contacto:</strong> {employee.emergencyContactName} ({employee.emergencyContactRelation}) • Tel: {employee.emergencyContactPhone}</p>
            </div>
          )}

          {/* Signature */}
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <div style={{ width: '40%', textAlign: 'center', borderTop: '1px solid #4b5563', paddingTop: '8px' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{employee.fullName}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Assinatura do Funcionário</p>
            </div>
            <div style={{ width: '40%', textAlign: 'center', borderTop: '1px solid #4b5563', paddingTop: '8px' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{company.legalRepresentative || 'Direção de Recursos Humanos'}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Pela Empresa</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
