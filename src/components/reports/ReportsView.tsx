import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileDown,
  Printer,
  Calendar,
  Building,
  Users,
  AlertTriangle,
  CreditCard,
  FileText,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { Employee, Contract, Vacation, Absence, PayrollSheet, Department } from '../../types/index.ts';
import { useCompany } from '../../context/CompanyContext.tsx';
import { exportToExcel, formatCurrency, formatDate, printElement } from '../../utils/exportUtils.ts';

export const ReportsView: React.FC = () => {
  const { visual, company } = useCompany();
  const [selectedReport, setSelectedReport] = useState<
    | 'geral_funcionarios'
    | 'contratos_terminar'
    | 'ferias_mes'
    | 'faltas_mes'
    | 'folha_salarios'
    | 'custos_departamento'
    | 'documentos_expirar'
  >('geral_funcionarios');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [payrollSheets, setPayrollSheets] = useState<PayrollSheet[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [e, c, v, a, p, d] = await Promise.all([
          api.getEmployees(),
          api.getContracts(),
          api.getVacations(),
          api.getAbsences(),
          api.getPayrollSheets(),
          api.getDepartments(),
        ]);
        setEmployees(e);
        setContracts(c);
        setVacations(v);
        setAbsences(a);
        setPayrollSheets(p);
        setDepartments(d);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Compute report-specific data
  const handleExport = () => {
    if (selectedReport === 'geral_funcionarios') {
      const data = employees.map((e) => ({
        Código: e.code,
        Nome: e.fullName,
        'BI/Passaporte': e.idNumber,
        NIF: e.nif,
        Departamento: e.departmentName,
        Cargo: e.positionName,
        Admissão: e.admissionDate,
        'Salário Base': e.baseSalary,
        Status: e.status,
      }));
      exportToExcel(data, `Relatorio_Geral_Funcionarios_${new Date().toISOString().split('T')[0]}`);
    } else if (selectedReport === 'contratos_terminar') {
      const expiring = contracts.filter((c) => {
        if (!c.endDate || c.status === 'TERMINADO') return false;
        const days = Math.ceil(
          (new Date(c.endDate).getTime() - new Date('2026-09-22').getTime()) / (1000 * 3600 * 24)
        );
        return days >= 0 && days <= 60;
      });
      const data = expiring.map((c) => ({
        Contrato: c.contractNumber,
        Funcionário: c.employeeName,
        Cargo: c.positionName,
        Departamento: c.departmentName,
        'Data Início': c.startDate,
        'Data Término': c.endDate,
        Salário: c.baseSalary,
        Status: c.status,
      }));
      exportToExcel(data, `Relatorio_Contratos_a_Terminar_${new Date().toISOString().split('T')[0]}`);
    } else if (selectedReport === 'custos_departamento') {
      const deptCosts = departments.map((d) => {
        const emps = employees.filter((e) => e.departmentId === d.id);
        const total = emps.reduce((acc, curr) => acc + curr.baseSalary, 0);
        return {
          Departamento: d.name,
          'Total Colaboradores': emps.length,
          'Massa Salarial Base': total,
        };
      });
      exportToExcel(dataWrapper(deptCosts), `Relatorio_Custos_Departamento`);
    } else if (selectedReport === 'folha_salarios' && payrollSheets.length > 0) {
      const latest = payrollSheets[0];
      const data = (latest.items || []).map((i) => ({
        Código: i.employeeCode,
        Nome: i.employeeName,
        Departamento: i.departmentName,
        'Salário Base': i.baseSalary,
        'Total Bruto': i.grossSalary,
        INSS: i.inss,
        IRT: i.irt,
        'Descontos Faltas': i.absenceDeduction,
        Líquido: i.netSalary,
      }));
      exportToExcel(data, `Relatorio_Folha_${latest.month}_${latest.year}`);
    } else {
      alert('Relatório exportado para o formato solicitado.');
    }
  };

  const dataWrapper = (arr: any[]) => arr;

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Relatórios Empresariais & Mapas de Gestão
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Geração de relatórios executivos para direção, mapa de encargos salariais e exportação para PDF e Excel.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exportar para Excel
          </button>
          <button
            onClick={() => printElement('report-view-container', `Relatorio_${selectedReport}`)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'geral_funcionarios', label: 'Quadro Geral de Funcionários', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'contratos_terminar', label: 'Contratos a Terminar', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { id: 'custos_departamento', label: 'Custos Salariais por Departamento', icon: <Building className="w-3.5 h-3.5" /> },
          { id: 'folha_salarios', label: 'Mapa Salarial do Mês', icon: <CreditCard className="w-3.5 h-3.5" /> },
          { id: 'ferias_mes', label: 'Plano de Férias', icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: 'faltas_mes', label: 'Mapa de Assiduidade e Faltas', icon: <FileText className="w-3.5 h-3.5" /> },
        ].map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedReport(r.id as any)}
            className={`px-4 py-2.5 rounded-xl transition-all font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 border ${
              selectedReport === r.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {r.icon}
            {r.label}
          </button>
        ))}
      </div>

      {/* Report Content Container */}
      <div
        id="report-view-container"
        className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6"
      >
        {/* Printable Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase">{company.companyName}</h2>
            <p className="text-xs text-slate-600">
              NIF: {company.nif} • {company.address}, {company.province}
            </p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold text-slate-800 uppercase">
              {selectedReport === 'geral_funcionarios' && 'RELATÓRIO GERAL DO EFETIVO DE COLABORADORES'}
              {selectedReport === 'contratos_terminar' && 'MAPA DE CONTRATOS A TERMINAR (ALERTA DE VENCIMENTO)'}
              {selectedReport === 'custos_departamento' && 'RELATÓRIO DE ENCARGOS SALARIAIS POR DEPARTAMENTO'}
              {selectedReport === 'folha_salarios' && 'MAPA RESUMO DO PROCESSAMENTO SALARIAL'}
              {selectedReport === 'ferias_mes' && 'MAPA GERAL DE FÉRIAS REGULAMENTARES'}
              {selectedReport === 'faltas_mes' && 'RELATÓRIO DE ASSIDUIDADE E AUSÊNCIAS'}
            </h3>
            <p className="text-[11px] text-slate-500">Emitido em: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Report 1: Quadro Geral */}
        {selectedReport === 'geral_funcionarios' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Nome Completo</th>
                  <th className="py-2.5 px-3">BI / Passaporte</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Cargo</th>
                  <th className="py-2.5 px-3">Admissão</th>
                  <th className="py-2.5 px-3">Salário Base</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{e.code}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{e.fullName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{e.idNumber}</td>
                    <td className="py-2.5 px-3">{e.departmentName}</td>
                    <td className="py-2.5 px-3">{e.positionName}</td>
                    <td className="py-2.5 px-3">{formatDate(e.admissionDate)}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-700">
                      {formatCurrency(e.baseSalary, visual.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 2: Contratos a Terminar */}
        {selectedReport === 'contratos_terminar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Nº Contrato</th>
                  <th className="py-2.5 px-3">Funcionário</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Início</th>
                  <th className="py-2.5 px-3">Término</th>
                  <th className="py-2.5 px-3">Salário</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts
                  .filter((c) => c.endDate && c.status === 'ATIVO')
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold">{c.contractNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.employeeName}</td>
                      <td className="py-2.5 px-3">{c.departmentName}</td>
                      <td className="py-2.5 px-3">{formatDate(c.startDate)}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-700">{formatDate(c.endDate)}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">
                        {formatCurrency(c.baseSalary, visual.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3">{c.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 3: Custos por Departamento */}
        {selectedReport === 'custos_departamento' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Total de Colaboradores</th>
                  <th className="py-2.5 px-3">Custo Mensal (Massa Salarial Base)</th>
                  <th className="py-2.5 px-3">Média Salarial por Colaborador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => {
                  const emps = employees.filter((e) => e.departmentId === d.id);
                  const total = emps.reduce((acc, curr) => acc + curr.baseSalary, 0);
                  const avg = emps.length > 0 ? total / emps.length : 0;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                      <td className="py-2.5 px-3 font-mono">{d.code}</td>
                      <td className="py-2.5 px-3 font-bold">{emps.length}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">
                        {formatCurrency(total, visual.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {formatCurrency(avg, visual.currencySymbol)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 4: Folha de Salários do Mês */}
        {selectedReport === 'folha_salarios' && (
          <div className="overflow-x-auto">
            {payrollSheets.length > 0 ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">{payrollSheets[0].title}</span>
                  <div className="flex gap-4">
                    <span>
                      Total Bruto:{' '}
                      <strong>{formatCurrency(payrollSheets[0].totalGross, visual.currencySymbol)}</strong>
                    </span>
                    <span>
                      Total Líquido:{' '}
                      <strong className="text-emerald-700">
                        {formatCurrency(payrollSheets[0].totalNet, visual.currencySymbol)}
                      </strong>
                    </span>
                  </div>
                </div>

                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Nome</th>
                      <th className="py-2.5 px-3">Departamento</th>
                      <th className="py-2.5 px-3">Salário Base</th>
                      <th className="py-2.5 px-3">Bruto Total</th>
                      <th className="py-2.5 px-3">INSS (3%)</th>
                      <th className="py-2.5 px-3">IRT</th>
                      <th className="py-2.5 px-3">Líquido a Pagar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {((payrollSheets[0] && payrollSheets[0].items) || []).map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono">{i.employeeCode}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{i.employeeName}</td>
                        <td className="py-2.5 px-3">{i.departmentName}</td>
                        <td className="py-2.5 px-3">{formatCurrency(i.baseSalary, visual.currencySymbol)}</td>
                        <td className="py-2.5 px-3 font-bold text-blue-700">
                          {formatCurrency(i.grossSalary, visual.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-rose-700">
                          - {formatCurrency(i.inss, visual.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-rose-700">
                          - {formatCurrency(i.irt, visual.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 font-black text-emerald-800">
                          {formatCurrency(i.netSalary, visual.currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhuma folha de salários gerada para apresentar.
              </div>
            )}
          </div>
        )}

        {/* Report 5: Férias */}
        {selectedReport === 'ferias_mes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Início</th>
                  <th className="py-2.5 px-3">Fim</th>
                  <th className="py-2.5 px-3">Dias Gozados</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{v.employeeName}</td>
                    <td className="py-2.5 px-3">{v.departmentName}</td>
                    <td className="py-2.5 px-3">{v.typeName}</td>
                    <td className="py-2.5 px-3">{formatDate(v.startDate)}</td>
                    <td className="py-2.5 px-3">{formatDate(v.endDate)}</td>
                    <td className="py-2.5 px-3 font-bold">{v.daysCount} dias</td>
                    <td className="py-2.5 px-3">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 6: Faltas */}
        {selectedReport === 'faltas_mes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Horas</th>
                  <th className="py-2.5 px-3">Motivo</th>
                  <th className="py-2.5 px-3">Justificada?</th>
                  <th className="py-2.5 px-3">Desconto no Salário?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {absences.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{a.employeeName}</td>
                    <td className="py-2.5 px-3">{a.departmentName}</td>
                    <td className="py-2.5 px-3">{formatDate(a.date)}</td>
                    <td className="py-2.5 px-3">{a.hours}h</td>
                    <td className="py-2.5 px-3">{a.reason}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      {a.isJustified ? (
                        <span className="text-emerald-700">Sim</span>
                      ) : (
                        <span className="text-rose-700">Não</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {a.deductFromSalary ? 'Sim (Desconto)' : 'Não'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
