import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'employee' | 'contract' | 'document' | 'vacation' | 'absence' | 'payroll' | 'general';
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'general', customLabel }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = customLabel || status;

  // Normalization
  const s = String(status).toUpperCase();

  if (s === 'ATIVO' || s === 'VALIDO' || s === 'APROVADA' || s === 'PAGO' || s === 'CONCLUIDA' || s === 'JUSTIFICADA') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    if (!customLabel) {
      if (s === 'ATIVO') label = 'Ativo';
      if (s === 'VALIDO') label = 'Válido';
      if (s === 'APROVADA') label = 'Aprovada';
      if (s === 'PAGO') label = 'Pago';
      if (s === 'CONCLUIDA') label = 'Concluída';
      if (s === 'JUSTIFICADA') label = 'Justificada';
    }
  } else if (s === 'A_TERMINAR' || s === 'PENDENTE' || s === 'EM_ANALISE' || s === 'ATRASO' || s === 'EM_CURSO') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80';
    if (!customLabel) {
      if (s === 'A_TERMINAR') label = 'A Terminar';
      if (s === 'PENDENTE') label = 'Pendente';
      if (s === 'EM_ANALISE') label = 'Em Análise';
      if (s === 'ATRASO') label = 'Atraso';
      if (s === 'EM_CURSO') label = 'Em Curso';
    }
  } else if (s === 'TERMINADO' || s === 'EXPIRADO' || s === 'REJEITADA' || s === 'INJUSTIFICADA' || s === 'CANCELADO' || s === 'DESLIGADO') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
    if (!customLabel) {
      if (s === 'TERMINADO') label = 'Terminado';
      if (s === 'EXPIRADO') label = 'Expirado';
      if (s === 'REJEITADA') label = 'Rejeitada';
      if (s === 'INJUSTIFICADA') label = 'Injustificada';
      if (s === 'CANCELADO') label = 'Cancelado';
      if (s === 'DESLIGADO') label = 'Desligado';
    }
  } else if (s === 'EM_FERIAS' || s === 'LICENCA_PARENTAL' || s === 'AUSENCIA_AUTORIZADA') {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200/80';
    if (!customLabel) {
      if (s === 'EM_FERIAS') label = 'Em Férias';
      if (s === 'AUSENCIA_AUTORIZADA') label = 'Autorizada';
    }
  } else if (s === 'SUSPENSO' || s === 'SAIDA_ANTECIPADA') {
    colorClasses = 'bg-orange-50 text-orange-700 border-orange-200/80';
    if (!customLabel) {
      if (s === 'SUSPENSO') label = 'Suspenso';
      if (s === 'SAIDA_ANTECIPADA') label = 'Saída Antecipada';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses} whitespace-nowrap`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};
