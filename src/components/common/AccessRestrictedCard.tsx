import React from 'react';
import { Lock, ShieldAlert, ArrowLeft, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AccessRestrictedCardProps {
  title?: string;
  description?: string;
  onGoBack?: () => void;
  onSwitchAccount?: () => void;
}

export const AccessRestrictedCard: React.FC<AccessRestrictedCardProps> = ({
  title = 'Módulo Bloqueado por Sigilo Corporativo',
  description = 'Esta área contém informações financeiras, contratuais e administrativas confidenciais restritas aos responsáveis de Recursos Humanos, Contabilidade e Direção.',
  onGoBack,
  onSwitchAccount,
}) => {
  const { user, openLoginModal } = useAuth();

  return (
    <div className="min-h-[420px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200/80 shadow-md p-8 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-50 rounded-full blur-2xl pointer-events-none" />
        
        <div className="w-16 h-16 rounded-2xl bg-amber-100/80 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Lock className="w-8 h-8 text-amber-700" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          Sigilo de Informação
        </div>

        <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h2>

        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          {description}
        </p>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs mb-6">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Utilizador Conectado
          </div>
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <span>{user?.name || 'Colaborador'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-800">
              {user?.role || 'COLABORADOR'}
            </span>
          </div>
          {user?.employeeCode && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Código: <span className="font-mono font-medium">{user.employeeCode}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Meu Painel
            </button>
          )}

          <button
            onClick={() => {
              if (onSwitchAccount) onSwitchAccount();
              else if (openLoginModal) openLoginModal();
            }}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Acesso com Senha (RH)
          </button>
        </div>
      </div>
    </div>
  );
};
