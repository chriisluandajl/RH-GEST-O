import React, { useState } from 'react';
import { ShieldCheck, Building2 } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext.tsx';

interface CompanyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'watermark';
  mode?: 'watermark' | 'normal';
  className?: string;
  showText?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  size = 'md',
  mode,
  className = '',
  showText = false,
}) => {
  const { company, visual } = useCompany();
  const [imgError, setImgError] = useState(false);

  const logoSrc = company.logoUrl || '/company_logo.jpg';
  const isWatermark = size === 'watermark' || mode === 'watermark';

  if (isWatermark) {
    return (
      <div
        className={`pointer-events-none select-none absolute inset-0 overflow-hidden flex flex-col items-center justify-center text-center z-0 ${className}`}
        aria-hidden="true"
      >
        <div className="relative flex items-center justify-center">
          {!imgError ? (
            <img
              src={logoSrc}
              alt=""
              onError={() => setImgError(true)}
              className="w-80 h-80 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] object-contain opacity-[0.045] grayscale contrast-125 transition-all"
            />
          ) : (
            <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-full border-8 border-slate-300/30 flex items-center justify-center opacity-[0.05]">
              <ShieldCheck className="w-56 h-56 text-slate-800" />
            </div>
          )}
        </div>
        <div className="mt-3 text-slate-900/[0.04] font-black text-xl sm:text-3xl tracking-[0.25em] uppercase select-none max-w-lg">
          {company.companyName || 'GESTÃO RH & CONTRATOS'}
        </div>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }[size] || 'w-9 h-9 text-sm';

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }[size] || 'w-4 h-4';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeClasses} relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 flex items-center justify-center shadow-xs border border-blue-200/40 shrink-0`}
      >
        {!imgError ? (
          <img
            src={logoSrc}
            alt={company.companyName || 'Logo da Empresa'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center text-white font-black">
            <Building2 className={iconSizes} />
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-extrabold tracking-tight text-slate-900 truncate text-sm sm:text-base">
            {company.companyName || 'GESTÃO EMPRESARIAL RH'}
          </span>
          <span className="text-[11px] font-medium text-slate-500 truncate">
            {company.commercialName || 'Gestão de Funcionários, Contratos e Documentos'}
          </span>
        </div>
      )}
    </div>
  );
};
