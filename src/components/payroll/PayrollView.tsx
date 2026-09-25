import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  FileDown,
  Printer,
  CheckCircle2,
  Send,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Lock,
  IdCard,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { PayrollSheet, PayrollItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { Modal } from '../common/Modal.tsx';
import { PayslipModal } from './PayslipModal.tsx';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToExcel, formatCurrency, formatDate, printElement } from '../../utils/exportUtils.ts';
import { CompanyLogo } from '../common/CompanyLogo.tsx';

interface PayrollViewProps {
  initialSubModule?: string;
  initialSelectedId?: string;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  initialSubModule,
  initialSelectedId,
}) => {
  const { visual, company } = useCompany();
  const { hasPermission, addToast, isEmployeeOnly, currentEmployee, user } = useAuth();

  const [sheets, setSheets] = useState<PayrollSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<PayrollSheet | null>(null);
  const [loading, setLoading] = useState(true);

  // New Sheet Modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newMonth, setNewMonth] = useState('09');
  const [newYear, setNewYear] = useState(2026);
  const [newTitle, setNewTitle] = useState('Processamento Salarial - Setembro 2026');

  // Payslip Modal
  const [selectedItemForPayslip, setSelectedItemForPayslip] = useState<PayrollItem | any | null>(null);
  const [selectedSheetForPayslip, setSelectedSheetForPayslip] = useState<PayrollSheet | null>(null);

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<PayrollSheet | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getPayrollSheets();
      const safeSheets = (data || []).map((s: any) => {
        const items = s.items || s.entries || [];
        const refM = s.referenceMonth || `${s.year || 2026}-${s.month || '09'}`;
        const parts = refM.split('-');
        return {
          ...s,
          items,
          entries: items,
          month: s.month || parts[1] || '09',
          year: s.year || Number(parts[0]) || 2026,
          totalEmployees: s.totalEmployees || s.employeeCount || items.length,
          employeeCount: s.employeeCount || s.totalEmployees || items.length,
        };
      });
      setSheets(safeSheets);

      if (safeSheets.length > 0) {
        if (initialSelectedId) {
          const match = safeSheets.find((s) => s.id === initialSelectedId);
          setSelectedSheet(match || safeSheets[0]);
        } else if (!selectedSheet) {
          setSelectedSheet(safeSheets[0]);
        } else {
          const refreshed = safeSheets.find((s) => s.id === selectedSheet.id);
          setSelectedSheet(refreshed || safeSheets[0]);
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Erro ao carregar folhas de salário.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialSubModule === 'gerar' && !isEmployeeOnly) {
      setIsNewOpen(true);
    }
  }, [initialSubModule, isEmployeeOnly]);

  const handleGenerateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createPayrollSheet({
        title: newTitle,
        month: newMonth,
        year: Number(newYear),
      });
      addToast(`Folha de salário "${created.title}" processada com sucesso!`, 'success');
      setIsNewOpen(false);
      await loadData();
      setSelectedSheet(created);
    } catch (err: any) {
      addToast(err.message || 'Erro ao gerar folha salarial.', 'error');
    }
  };

  const handleApproveSheet = async () => {
    if (!selectedSheet) return;
    try {
      const updated = await api.updatePayrollSheet(selectedSheet.id, {
        status: 'APROVADA',
        approvedBy: 'Direção Financeira & RH',
      });
      addToast(`Folha "${updated.title}" aprovada!`, 'success');
      setSelectedSheet(updated);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao aprovar folha.', 'error');
    }
  };

  const handlePaySheet = async () => {
    if (!selectedSheet) return;
    try {
      const updated = await api.updatePayrollSheet(selectedSheet.id, {
        status: 'PAGA',
        paymentDate: new Date().toISOString().split('T')[0],
      });
      addToast(`Folha "${updated.title}" liquidada via transferência bancária!`, 'success');
      setSelectedSheet(updated);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao liquidar folha.', 'error');
    }
  };

  const handleDeleteSheet = async () => {
    if (!sheetToDelete) return;
    try {
      await api.deletePayrollSheet(sheetToDelete.id);
      addToast('Folha de salário eliminada.', 'info');
      setIsDeleteOpen(false);
      setSelectedSheet(null);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao eliminar folha.', 'error');
    }
  };

  const handleExportBankTransfer = () => {
    if (!selectedSheet) return;
    const items = selectedSheet.items || selectedSheet.entries || [];
    const data = items.map((item: any) => ({
      'Código Funcionário': item.employeeCode,
      'Nome Completo': item.employeeName,
      'Banco': item.bankName || 'BAI',
      'Conta': item.accountNumber || '-',
      'IBAN': item.iban || '-',
      'Valor Líquido': item.netSalary,
      'Moeda': visual.currency || 'AOA',
      'Referência': `SAL_${selectedSheet.month}_${selectedSheet.year}`,
    }));
    exportToExcel(data, `Transferencia_Bancaria_${selectedSheet.month}_${selectedSheet.year}`);
  };

  const handleExportSheetExcel = () => {
    if (!selectedSheet) return;
    const items = selectedSheet.items || selectedSheet.entries || [];
    const data = items.map((item: any) => {
      const meal = item.mealAllowance ?? item.foodAllowance ?? 60000;
      const trans = item.transportAllowance ?? 60000;
      const inss = item.inss ?? Math.round(item.baseSalary * 0.03);
      const irt = item.irt ?? Math.round(item.baseSalary * 0.07);
      const gross = item.grossSalary ?? (item.baseSalary + meal + trans + (item.bonus || 0));
      const net = item.netSalary ?? (gross - inss - irt - (item.absenceDeduction || 0));
      return {
        'Código': item.employeeCode,
        'Nome': item.employeeName,
        'Cargo': item.positionName,
        'Departamento': item.departmentName,
        'Salário Base': item.baseSalary,
        'Subs. Alimentação': meal,
        'Subs. Transporte': trans,
        'Total Bruto': gross,
        'INSS (3%)': inss,
        'IRT': irt,
        'Faltas': item.absenceDeduction || 0,
        'Líquido': net,
        'Banco': item.bankName || 'BAI',
        'IBAN': item.iban || '-',
      };
    });
    exportToExcel(data, `Folha_Pagamento_${selectedSheet.month}_${selectedSheet.year}`);
  };

  // If user is Employee / Collaborator: RESTRICT VIEW TO THEIR OWN PAYSLIPS
  if (isEmployeeOnly) {
    const emp = currentEmployee;
    const empId = emp?.id || user?.employeeId;

    // Collect all payslips for this employee across all processed sheets
    const myPayslips = sheets
      .flatMap((s) => {
        const items = s.items || s.entries || [];
        return items
          .filter((item: any) => item.employeeId === empId || item.employeeCode === emp?.code || item.employeeCode === user?.employeeCode)
          .map((item: any) => ({
            ...item,
            sheetTitle: s.title,
            sheetMonth: s.month,
            sheetYear: s.year,
            sheetStatus: s.status,
            paymentDate: s.paymentDate,
            parentSheet: s,
          }));
      });

    return (
      <div className="relative space-y-6">
        <CompanyLogo mode="watermark" />

        {/* Collaborator Header */}
        <div className="relative z-10 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Meus Recibos de Vencimento
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  {myPayslips.length} Recibos Disponíveis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte e imprima os seus holerites e recibos de remuneração salarial individual.
              </p>
            </div>
          </div>
        </div>

        {/* Confidentiality Notice */}
        <div className="relative z-10 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-amber-900 shadow-2xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold uppercase tracking-wider block text-amber-900 mb-0.5">
              Sigilo Salarial & Proteção de Dados
            </span>
            <p className="text-amber-800 leading-relaxed">
              O acesso a folhas globais de outros trabalhadores, totais de massa salarial corporativa e ficheiros de exportação bancária é restrito exclusivamente aos Administradores e Recursos Humanos. Neste portal, tem acesso transparente e seguro aos seus próprios recibos de vencimento emitidos.
            </p>
          </div>
        </div>

        {/* Collaborator Payslips List */}
        <div className="relative z-10 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Histórico de Recibos Emitidos</h2>
            <span className="text-xs text-slate-500 font-mono">
              BI: {emp?.idNumber || user?.biNumber || '---'} • Cód: {emp?.code || user?.employeeCode || '---'}
            </span>
          </div>

          {myPayslips.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Nenhum recibo de vencimento emitido até ao momento.</p>
              <p className="text-slate-400 mt-1">Os seus recibos ficarão disponíveis aqui assim que a Direção processar a folha de pagamento do mês.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Período / Folha</th>
                    <th className="py-3 px-4">Vencimento Base</th>
                    <th className="py-3 px-4">Subsídios</th>
                    <th className="py-3 px-4">Total Bruto</th>
                    <th className="py-3 px-4">Descontos (INSS + IRT)</th>
                    <th className="py-3 px-4">Valor Líquido</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myPayslips.map((item: any, idx: number) => {
                    const meal = item.mealAllowance ?? item.foodAllowance ?? 60000;
                    const trans = item.transportAllowance ?? 60000;
                    const inss = item.inss ?? Math.round(item.baseSalary * 0.03);
                    const irt = item.irt ?? Math.round(item.baseSalary * 0.07);
                    const gross = item.grossSalary ?? (item.baseSalary + meal + trans + (item.bonus || 0));
                    const net = item.netSalary ?? (gross - inss - irt - (item.absenceDeduction || 0));

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{item.sheetTitle}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.sheetMonth}/{item.sheetYear}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {formatCurrency(item.baseSalary, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatCurrency(meal + trans + (item.bonus || 0), visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-4 font-bold text-blue-700">
                          {formatCurrency(gross, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-rose-700 font-medium">
                          - {formatCurrency(inss + irt + (item.absenceDeduction || 0), visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-800 bg-emerald-50/30">
                          {formatCurrency(net, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={item.sheetStatus || 'PAGA'} type="payroll" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedItemForPayslip(item);
                              setSelectedSheetForPayslip(item.parentSheet);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Recibo</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payslip Modal */}
        <PayslipModal
          isOpen={Boolean(selectedItemForPayslip)}
          onClose={() => {
            setSelectedItemForPayslip(null);
            setSelectedSheetForPayslip(null);
          }}
          item={selectedItemForPayslip}
          sheet={selectedSheetForPayslip}
        />
      </div>
    );
  }

  // Corporate Management View (Admins, HR, Finance)
  return (
    <div className="relative space-y-6">
      <CompanyLogo mode="watermark" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Processamento Salarial & Folhas de Pagamento
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              {sheets.length} Folhas Geradas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cálculo de proventos brutos, deduções legais de INSS, IRT e faltas, emissão de recibos e ficheiros bancários.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('canManagePayroll') && (
            <button
              onClick={() => setIsNewOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Processar Nova Folha
            </button>
          )}
        </div>
      </div>

      {/* Sheets Navigation Bar */}
      <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {sheets.map((s) => {
          const m = s.month || '09';
          const y = s.year || 2026;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSheet(s)}
              className={`px-4 py-2 rounded-xl transition-all font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                selectedSheet?.id === s.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {m}/{y} • {s.title}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                  selectedSheet?.id === s.id
                    ? 'bg-blue-700 text-blue-100'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.status}
              </span>
            </button>
          );
        })}
      </div>

      {selectedSheet ? (
        <div className="relative z-10 space-y-4">
          {/* Summary KPIs for this sheet */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Bruto da Folha
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(selectedSheet.totalGross, visual.currencySymbol)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {(selectedSheet.items || selectedSheet.entries || []).length} colaboradores processados
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Deduções Totais (INSS + IRT)
              </span>
              <div className="text-xl font-bold text-rose-700 mt-1">
                - {formatCurrency(selectedSheet.totalDeductions, visual.currencySymbol)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Retenções na fonte</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Líquido a Transferir
              </span>
              <div className="text-xl font-black text-emerald-800 mt-1">
                {formatCurrency(selectedSheet.totalNet, visual.currencySymbol)}
              </div>
              <span className="text-[11px] text-emerald-600 mt-0.5 block">
                Disponibilizado aos colaboradores
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Estado do Processamento
                </span>
                <div className="mt-1">
                  <StatusBadge status={selectedSheet.status || 'RASCUNHO'} type="payroll" />
                </div>
              </div>
              <span className="text-[11px] text-slate-400 block mt-2">
                Criado em {formatDate(selectedSheet.createdAt)}
              </span>
            </div>
          </div>

          {/* Action Header for Sheet */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{selectedSheet.title}</span>
              {selectedSheet.paymentDate && (
                <span className="text-slate-500">
                  • Liquidada em {formatDate(selectedSheet.paymentDate)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportBankTransfer}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                title="Exportar dados para transferência bancária"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Ficheiro Bancário (Excel)
              </button>

              <button
                onClick={handleExportSheetExcel}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                Mapa Geral Excel
              </button>

              <button
                onClick={() => printElement('payroll-details-table', `Folha-${selectedSheet.month}-${selectedSheet.year}`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Folha
              </button>

              {selectedSheet.status === 'RASCUNHO' && hasPermission('canManagePayroll') && (
                <button
                  onClick={handleApproveSheet}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aprovar Folha
                </button>
              )}

              {selectedSheet.status === 'APROVADA' && hasPermission('canManagePayroll') && (
                <button
                  onClick={handlePaySheet}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Marcar como Liquidada / Paga
                </button>
              )}

              {hasPermission('canManagePayroll') && (
                <button
                  onClick={() => {
                    setSheetToDelete(selectedSheet);
                    setIsDeleteOpen(true);
                  }}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Eliminar esta folha"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Detailed Employee Payroll Table */}
          <div
            id="payroll-details-table"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Colaborador</th>
                    <th className="py-3 px-3">Cargo / Dept</th>
                    <th className="py-3 px-3">Salário Base</th>
                    <th className="py-3 px-3">Subsídios</th>
                    <th className="py-3 px-3">Total Bruto</th>
                    <th className="py-3 px-3">INSS (3%)</th>
                    <th className="py-3 px-3">IRT</th>
                    <th className="py-3 px-3">Descontos Faltas</th>
                    <th className="py-3 px-3">Líquido a Pagar</th>
                    <th className="py-3 px-3 text-right no-print">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedSheet.items || selectedSheet.entries || []).map((item: any) => {
                    const meal = item.mealAllowance ?? item.foodAllowance ?? 60000;
                    const trans = item.transportAllowance ?? 60000;
                    const bonus = item.bonus ?? 0;
                    const inss = item.inss ?? Math.round(item.baseSalary * 0.03);
                    const irt = item.irt ?? Math.round(item.baseSalary * 0.07);
                    const absence = item.absenceDeduction ?? item.absenceDeductions ?? 0;
                    const gross = item.grossSalary ?? (item.baseSalary + meal + trans + bonus);
                    const net = item.netSalary ?? Math.max(0, gross - inss - irt - absence);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.employeeName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.employeeCode}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{item.positionName}</div>
                          <div className="text-[11px] text-slate-400">{item.departmentName}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {formatCurrency(item.baseSalary, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {formatCurrency(meal + trans + bonus, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-700">
                          {formatCurrency(gross, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-rose-700 font-medium">
                          - {formatCurrency(inss, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-rose-700 font-medium">
                          - {formatCurrency(irt, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-rose-700 font-medium">
                          {absence > 0 ? `- ${formatCurrency(absence, visual.currencySymbol)}` : '-'}
                        </td>
                        <td className="py-3 px-3 font-black text-emerald-800 bg-emerald-50/40">
                          {formatCurrency(net, visual.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right no-print">
                          <button
                            onClick={() => {
                              setSelectedItemForPayslip(item);
                              setSelectedSheetForPayslip(selectedSheet);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                            title="Emitir Recibo Individual"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Recibo</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          Nenhuma folha de salários selecionada.
        </div>
      )}

      {/* Modal: Processar Nova Folha */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Processar Nova Folha de Pagamento"
        subtitle="O sistema calculará automaticamente os vencimentos de todos os colaboradores ativos"
        maxWidth="md"
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
              onClick={handleGenerateSheet}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Calcular e Gerar Folha
            </button>
          </div>
        }
      >
        <form onSubmit={handleGenerateSheet} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Designação da Folha <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mês de Competência</label>
              <select
                value={newMonth}
                onChange={(e) => {
                  setNewMonth(e.target.value);
                  setNewTitle(`Processamento Salarial - Mês ${e.target.value}/${newYear}`);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="01">01 - Janeiro</option>
                <option value="02">02 - Fevereiro</option>
                <option value="03">03 - Março</option>
                <option value="04">04 - Abril</option>
                <option value="05">05 - Maio</option>
                <option value="06">06 - Junho</option>
                <option value="07">07 - Julho</option>
                <option value="08">08 - Agosto</option>
                <option value="09">09 - Setembro</option>
                <option value="10">10 - Outubro</option>
                <option value="11">11 - Novembro</option>
                <option value="12">12 - Dezembro</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ano</label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => {
                  setNewYear(Number(e.target.value));
                  setNewTitle(`Processamento Salarial - Mês ${newMonth}/${e.target.value}`);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-slate-700">
            <p className="font-semibold text-blue-900 mb-1">Cálculo Automático Regulamentar:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
              <li>Aplicação de INSS (3% retido na fonte do trabalhador)</li>
              <li>Tabela de retenção de IRT progressiva</li>
              <li>Dedução de faltas injustificadas registadas no período</li>
              <li>Totalização de subsídios de alimentação e transporte</li>
            </ul>
          </div>
        </form>
      </Modal>

      {/* Individual Payslip Modal */}
      <PayslipModal
        isOpen={Boolean(selectedItemForPayslip)}
        onClose={() => {
          setSelectedItemForPayslip(null);
          setSelectedSheetForPayslip(null);
        }}
        item={selectedItemForPayslip}
        sheet={selectedSheetForPayslip || selectedSheet}
      />

      {/* Delete Sheet Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteSheet}
        title="Eliminar Folha de Salários"
        message={`Deseja eliminar a folha "${sheetToDelete?.title}"? Todos os recibos deste processamento serão removidos.`}
        confirmText="Sim, Eliminar"
        isDestructive
      />
    </div>
  );
};
