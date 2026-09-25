import React from 'react';
import { Modal } from '../common/Modal.tsx';
import { PayrollItem, PayrollSheet } from '../../types/index.ts';
import { useCompany } from '../../context/CompanyContext.tsx';
import { formatCurrency, formatDate, printElement } from '../../utils/exportUtils.ts';
import { Printer } from 'lucide-react';
import { CompanyLogo } from '../common/CompanyLogo.tsx';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollItem | any;
  sheet: PayrollSheet | any;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  item,
  sheet,
}) => {
  const { company, visual } = useCompany();

  if (!isOpen || !item || !sheet) return null;

  const sheetMonth = sheet.month || (sheet.referenceMonth ? sheet.referenceMonth.split('-')[1] : '09');
  const sheetYear = sheet.year || (sheet.referenceMonth ? sheet.referenceMonth.split('-')[0] : 2026);

  const mealVal = item.mealAllowance ?? item.foodAllowance ?? 60000;
  const transportVal = item.transportAllowance ?? 60000;
  const inssVal = item.inss ?? Math.round(item.baseSalary * 0.03);
  const irtVal = item.irt ?? Math.round(item.baseSalary * 0.07);
  const absenceDeductionVal = item.absenceDeduction ?? item.absenceDeductions ?? 0;
  const grossVal = item.grossSalary ?? (item.baseSalary + mealVal + transportVal + (item.bonus || 0));
  const netVal = item.netSalary ?? Math.max(0, grossVal - inssVal - irtVal - absenceDeductionVal);

  const handlePrint = () => {
    printElement('payslip-print-canvas', `Recibo-${item.employeeCode}-${sheetMonth}-${sheetYear}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Recibo de Vencimento: ${item.employeeName}`}
      subtitle={`Mês de Referência: ${sheetMonth}/${sheetYear} • Código: ${item.employeeCode}`}
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Recibo de Vencimento
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      }
    >
      <div
        id="payslip-print-canvas"
        className="bg-white p-6 sm:p-8 border border-slate-200 rounded-xl space-y-6 text-slate-900"
      >
        {/* Company Header with Company Logo */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <CompanyLogo size="md" />
            <div>
              <h1 className="text-base font-bold uppercase text-slate-900 leading-tight">
                {company.companyName}
              </h1>
              <p className="text-[11px] text-slate-600 mt-0.5">
                NIF: {company.nif} • {company.address}
              </p>
              <p className="text-[11px] text-slate-600">
                Tel: {company.phone1} • {company.email}
              </p>
            </div>
          </div>
          <div className="text-right sm:self-center">
            <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
              RECIBO DE VENCIMENTO
            </h2>
            <p className="text-xs font-bold text-blue-700 mt-0.5">
              Período: {sheetMonth} / {sheetYear}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Folha: {sheet.title}</p>
          </div>
        </div>

        {/* Employee Info Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Colaborador:</span>
            <span className="font-bold text-slate-900">{item.employeeName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Código:</span>
            <span className="font-bold font-mono text-slate-900">{item.employeeCode}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Cargo:</span>
            <span className="font-medium text-slate-800">{item.positionName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Departamento:</span>
            <span className="font-medium text-slate-800">{item.departmentName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Nº Segurança Social:</span>
            <span className="font-mono text-slate-800">{item.socialSecurityNumber || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Banco:</span>
            <span className="font-medium text-slate-800">{item.bankName || 'BAI'}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 block text-[10px]">IBAN:</span>
            <span className="font-mono text-[11px] text-slate-800">{item.iban || '-'}</span>
          </div>
        </div>

        {/* Earnings and Deductions Table */}
        <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
          <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-300 font-bold text-slate-700 py-2 px-3">
            <div>REMUNERAÇÕES / RENDIMENTOS</div>
            <div className="text-right">DEDUÇÕES / DESCONTOS LEGAIS</div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-200">
            {/* Left: Earnings */}
            <div className="p-3 space-y-2">
              <div className="flex justify-between">
                <span>Salário Base</span>
                <span className="font-bold">{formatCurrency(item.baseSalary, visual.currencySymbol)}</span>
              </div>
              {transportVal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Subsídio de Transporte</span>
                  <span>{formatCurrency(transportVal, visual.currencySymbol)}</span>
                </div>
              )}
              {mealVal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Subsídio de Alimentação</span>
                  <span>{formatCurrency(mealVal, visual.currencySymbol)}</span>
                </div>
              )}
              {item.bonus > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Bónus / Gratificação</span>
                  <span>{formatCurrency(item.bonus, visual.currencySymbol)}</span>
                </div>
              )}
              {item.otherAllowances > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Outros Subsídios</span>
                  <span>{formatCurrency(item.otherAllowances, visual.currencySymbol)}</span>
                </div>
              )}
            </div>

            {/* Right: Deductions */}
            <div className="p-3 space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>Segurança Social (3%)</span>
                <span className="font-medium text-rose-700">
                  - {formatCurrency(inssVal, visual.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>IRT (Imposto de Rendimento)</span>
                <span className="font-medium text-rose-700">
                  - {formatCurrency(irtVal, visual.currencySymbol)}
                </span>
              </div>
              {absenceDeductionVal > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Desconto de Faltas</span>
                  <span className="font-medium text-rose-700">
                    - {formatCurrency(absenceDeductionVal, visual.currencySymbol)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Totals Subfooter */}
          <div className="grid grid-cols-2 bg-slate-50 border-t border-slate-300 py-2.5 px-3 font-semibold">
            <div className="flex justify-between">
              <span>Total Proventos Brutos:</span>
              <span className="text-blue-700 font-bold">{formatCurrency(grossVal, visual.currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-right pl-4">
              <span>Total Descontos:</span>
              <span className="text-rose-700 font-bold">
                - {formatCurrency(inssVal + irtVal + absenceDeductionVal, visual.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Net Salary Highlight */}
          <div className="bg-emerald-50 border-t-2 border-emerald-500 py-3 px-4 flex justify-between items-center font-bold text-sm text-emerald-900">
            <span>VALOR LÍQUIDO A RECEBER:</span>
            <span className="text-base sm:text-lg font-black text-emerald-800">
              {formatCurrency(netVal, visual.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-slate-500">
          <div className="border-t border-slate-300 pt-2">
            <p className="font-bold text-slate-700">{company.companyName}</p>
            <p className="text-[10px] text-slate-400">Direção de Recursos Humanos / Processamento</p>
          </div>
          <div className="border-t border-slate-300 pt-2">
            <p className="font-bold text-slate-700">{item.employeeName}</p>
            <p className="text-[10px] text-slate-400">Assinatura do Colaborador</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
