import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  FileSignature,
  AlertTriangle,
  Calendar,
  UserX,
  CreditCard,
  FolderLock,
  ArrowUpRight,
  Clock,
  ChevronRight,
  TrendingUp,
  Shield,
  IdCard,
  Lock,
  CheckCircle2,
  DollarSign,
  CalendarCheck,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { api } from '../../services/api.ts';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency } from '../../utils/exportUtils.ts';
import { AuditLog } from '../../types/index.ts';
import { CompanyLogo } from '../common/CompanyLogo.tsx';

interface DashboardOverviewProps {
  onNavigate: (module: string, subModule?: string) => void;
  onOpenQuickAction?: (action: string) => void;
  onSelectEmployee?: (empId: string) => void;
  onSelectContract?: (contractId: string) => void;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onOpenQuickAction,
  onSelectEmployee,
  onSelectContract,
}) => {
  const { visual, company } = useCompany();
  const { isEmployeeOnly, user, currentEmployee, openLoginModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [employeeAbsences, setEmployeeAbsences] = useState<any[]>([]);
  const [payrollSheets, setPayrollSheets] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, logsData, leavesData, absencesData, sheetsData] = await Promise.all([
          api.getDashboardStats(),
          api.getAuditLogs(),
          api.getVacations(),
          api.getAbsences(),
          api.getPayrollSheets(),
        ]);
        setStats(statsData);
        setAuditLogs(logsData.slice(0, 6));
        setEmployeeLeaves(leavesData || []);
        setEmployeeAbsences(absencesData || []);
        setPayrollSheets(sheetsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white rounded-2xl border border-slate-200" />
          <div className="h-72 bg-white rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  const { metrics, charts } = stats;

  // Collaborator specific calculations
  const emp = currentEmployee;
  const myAbsences = emp ? employeeAbsences.filter((a) => a.employeeId === emp.id) : [];
  const myLeaves = emp ? employeeLeaves.filter((l) => l.employeeId === emp.id) : [];
  const myPayrollEntries = emp
    ? payrollSheets
        .flatMap((s) => (s.entries || s.items || []).map((item: any) => ({ ...item, sheetMonth: s.referenceMonth, sheetTitle: s.title })))
        .filter((e: any) => e.employeeId === emp.id)
    : [];
  const latestPayslip = myPayrollEntries[0] || null;

  const vacationDaysTotal = 22;
  const vacationDaysApproved = myLeaves
    .filter((l) => l.status === 'APROVADA')
    .reduce((acc, l) => acc + (l.daysCount || l.businessDays || 0), 0);
  const vacationDaysRemaining = Math.max(0, vacationDaysTotal - vacationDaysApproved);

  if (isEmployeeOnly) {
    return (
      <div className="relative space-y-6">
        {/* Marca de Água com Logótipo da Empresa */}
        <CompanyLogo mode="watermark" />

        {/* Collaborator Profile Welcome Header */}
        <div className="relative z-10 bg-linear-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md border border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl font-black shadow-inner shrink-0">
              {emp?.photoUrl ? (
                <img src={emp.photoUrl} alt={emp.fullName} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                emp?.fullName?.substring(0, 2).toUpperCase() || user?.name?.substring(0, 2).toUpperCase() || 'CL'
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-1">
                <IdCard className="w-3.5 h-3.5 text-blue-300" />
                Portal do Colaborador • Acesso Individual
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Olá, {emp?.fullName || user?.name}!
              </h1>
              <p className="text-xs text-blue-200 mt-1 font-mono">
                Cód: {emp?.code || user?.employeeCode || 'EMP'} • BI: {emp?.idNumber || user?.biNumber || '---'} • Função: {emp?.jobRole || emp?.positionName || 'Colaborador'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('salaries', 'recibos')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Ver Meus Recibos
            </button>
            <button
              onClick={() => onNavigate('vacations', 'planeamento')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Pedir Férias
            </button>
          </div>
        </div>

        {/* Confidentiality Notice */}
        <div className="relative z-10 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-amber-900 shadow-2xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <strong className="font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
              Proteção de Dados & Sigilo Salarial
            </strong>
            <p className="text-amber-800 leading-relaxed">
              O seu perfil de colaborador está configurado para exibir exclusivamente os seus próprios registos de remuneração, histórico de faltas, férias e documentos contratuais. Relatórios gerais, dados de outros empregados e configurações administrativas estão protegidos por sigilo e restritos à Direção e Recursos Humanos.
            </p>
          </div>
        </div>

        {/* Personal Metric Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Salário Base */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Vencimento Base
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(emp?.baseSalary || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Contrato: <strong className="text-slate-700">{emp?.contractType || 'Tempo Indeterminado'}</strong>
              </p>
            </div>
          </div>

          {/* Card 2: Subsídios */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Subsídios Mensais
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-700">
                {formatCurrency(120000)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Alimentação (60.000) + Transporte (60.000)
              </p>
            </div>
          </div>

          {/* Card 3: Saldo de Férias */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Saldo de Férias
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                {vacationDaysRemaining} <span className="text-sm font-semibold text-slate-500">dias úteis</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {vacationDaysApproved} dias gozados de {vacationDaysTotal} dias de direito legal
              </p>
            </div>
          </div>

          {/* Card 4: Faltas / Ausências */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ausências Registadas
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                {myAbsences.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {myAbsences.filter((a) => a.isJustified).length} justificadas • {myAbsences.filter((a) => !a.isJustified).length} injustificadas
              </p>
            </div>
          </div>
        </div>

        {/* Collaborator Detail Tables */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Payslips */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Meus Recibos de Vencimento</h2>
                <p className="text-xs text-slate-500">Histórico de folhas salariais processadas</p>
              </div>
              <button
                onClick={() => onNavigate('salaries', 'recibos')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myPayrollEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum recibo de vencimento emitido até ao momento para este colaborador.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myPayrollEntries.slice(0, 4).map((entry: any) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{entry.sheetTitle || `Folha ${entry.sheetMonth}`}</p>
                      <p className="text-slate-500 text-[11px]">
                        Base: {formatCurrency(entry.baseSalary)} • Subsídios: {formatCurrency(entry.mealAllowance + entry.transportAllowance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-700 text-sm">
                        {formatCurrency(entry.netSalary)}
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {entry.status || 'PROCESSADO'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave & Absence Requests */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Minhas Férias & Ausências</h2>
                <p className="text-xs text-slate-500">Estado de pedidos e justificativos enviados</p>
              </div>
              <button
                onClick={() => onNavigate('vacations', 'planeamento')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Solicitar <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myLeaves.length === 0 && myAbsences.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Não existem pedidos de férias ou ausências recentes registadas.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myLeaves.slice(0, 3).map((leave: any) => (
                  <div key={leave.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Pedido de Férias: {leave.year}</p>
                      <p className="text-slate-500 text-[11px]">
                        {leave.startDate} a {leave.endDate} ({leave.daysCount || leave.businessDays || 0} dias)
                      </p>
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          leave.status === 'APROVADA'
                            ? 'bg-emerald-50 text-emerald-700'
                            : leave.status === 'REJEITADA'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>
                  </div>
                ))}
                {myAbsences.slice(0, 2).map((abs: any) => (
                  <div key={abs.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Falta: {abs.date}</p>
                      <p className="text-slate-500 text-[11px]">
                        Motivo: {abs.reason || 'Ausência ao posto de trabalho'}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          abs.isJustified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {abs.isJustified ? 'JUSTIFICADA' : 'INJUSTIFICADA'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Marca de Água com Logótipo da Empresa no Menu Inicial */}
      <CompanyLogo mode="watermark" />
      {/* Top Greeting & Fast Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Painel Executivo de Gestão de RH
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visão centralizada de quadros, contratos de trabalho, absentismo, férias e processamento salarial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenQuickAction ? onOpenQuickAction('novo-funcionario') : onNavigate('employees', 'novo')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            + Novo Funcionário
          </button>
          <button
            onClick={() => onNavigate('relatorios')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Relatórios Gerais
          </button>
        </div>
      </div>

      {/* Critical Alert Banner if contracts ending soon */}
      {metrics.contractsEndingSoon > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Atenção: Contratos Próximos do Vencimento
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Existem <strong>{metrics.contractsEndingSoon} contratos</strong> com término previsto nos próximos {visual.alertNoticeDays || visual.contractExpiryNoticeDays || 30} dias.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('contratos', 'a-terminar')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 transition-colors"
          >
            Ver Contratos
          </button>
        </div>
      )}

      {/* 8 Primary Corporate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Employees */}
        <div
          onClick={() => onNavigate('funcionarios')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Funcionários
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900">{metrics.totalEmployees}</div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {metrics.activeEmployees} Ativos
            </span>
          </div>
        </div>

        {/* Card 2: Active Contracts */}
        <div
          onClick={() => onNavigate('contratos', 'ativos')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contratos Ativos
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900">{metrics.activeContracts}</div>
            <span className="text-[11px] font-semibold text-slate-500">
              Vigentes no sistema
            </span>
          </div>
        </div>

        {/* Card 3: Contracts Ending Soon */}
        <div
          onClick={() => onNavigate('contratos', 'a-terminar')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contratos a Terminar
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900">{metrics.contractsEndingSoon}</div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Próx. 30 dias
            </span>
          </div>
        </div>

        {/* Card 4: Employees on Vacation */}
        <div
          onClick={() => onNavigate('ferias')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Colaboradores em Férias
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900">{metrics.onVacationEmployees}</div>
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
              Em gozo de descanso
            </span>
          </div>
        </div>

        {/* Card 5: Monthly Absences */}
        <div
          onClick={() => onNavigate('faltas')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faltas no Mês
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900">{metrics.currentMonthAbsences}</div>
            <span className="text-[11px] font-semibold text-slate-500">
              Registos este mês
            </span>
          </div>
        </div>

        {/* Card 6: Monthly Payroll Total */}
        <div
          onClick={() => onNavigate('salarios')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Folha Salarial Mensal
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-lg font-black text-slate-900 truncate">
              {formatCurrency(metrics.monthlyPayrollTotal, visual.currencySymbol)}
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0">
              Líquido
            </span>
          </div>
        </div>

        {/* Card 7: Digital Documents */}
        <div
          onClick={() => onNavigate('documentos')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Documentos Arquivados
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900">{metrics.totalDocuments}</div>
            <span className="text-[11px] font-semibold text-slate-500">
              {metrics.expiredDocuments} expirados
            </span>
          </div>
        </div>

        {/* Card 8: Active Ratio */}
        <div
          onClick={() => onNavigate('funcionarios')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Efetividade
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900">
              {Math.round((metrics.activeEmployees / Math.max(metrics.totalEmployees, 1)) * 100)}%
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Operacional
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Distribution by Department */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Funcionários por Departamento</h2>
              <p className="text-xs text-slate-500">Distribuição do quadro de pessoal por setor</p>
            </div>
            <button
              onClick={() => onNavigate('funcionarios')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.employeesByDepartment}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <YAxis
                  dataKey="department"
                  type="category"
                  width={110}
                  tick={{ fontSize: 11, fill: '#334155' }}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} Colaboradores`, 'Quantidade']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Payroll Evolution Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Evolução da Folha Salarial</h2>
              <p className="text-xs text-slate-500">Comparativo mensal de massa salarial bruta vs líquida</p>
            </div>
            <button
              onClick={() => onNavigate('salarios')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Ver folhas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={charts.payrollTrend}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(val: any) => [`${formatCurrency(val, visual.currencySymbol)}`, 'Valor']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  name="Salário Líquido"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Absences Types Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Distribuição de Ausências e Faltas</h2>
              <p className="text-xs text-slate-500">Classificação por motivo e justificação</p>
            </div>
            <button
              onClick={() => onNavigate('faltas')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Mapa de faltas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.absenceBreakdown}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} ocorrências`, 'Faltas']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Vacations Status & Audit Feed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Estado dos Pedidos de Férias</h2>
              <p className="text-xs text-slate-500">Controlo de planeamento e aprovações anuais</p>
            </div>
            <button
              onClick={() => onNavigate('ferias')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Planeamento <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.vacationsStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {charts.vacationsStatusBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Registos`, name]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs mt-2 text-slate-600">
            {charts.vacationsStatusBreakdown.map((item: any) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>
                  {item.name} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Audit Activities */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Registo de Atividades & Auditoria</h2>
            <p className="text-xs text-slate-500">Histórico rastreável das últimas operações efetuadas no ERP</p>
          </div>
          <button
            onClick={() => onNavigate('configuracoes', 'sistema')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Ver todos os logs <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 mr-2">{log.action}:</span>
                  <span className="text-slate-600">{log.details}</span>
                </div>
              </div>
              <div className="text-slate-400 text-[11px] shrink-0 ml-4">
                por <strong>{log.userName}</strong> • {new Date(log.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
