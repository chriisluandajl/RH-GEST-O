import React, { useState, useRef } from 'react';
import { useCompany } from '../../context/CompanyContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Building2,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

interface CompanyLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COMPANY_LOGOS = [
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300&auto=format&fit=crop&q=80',
];

export const CompanyLogoModal: React.FC<CompanyLogoModalProps> = ({ isOpen, onClose }) => {
  const { company, updateCompany } = useCompany();
  const { addToast } = useAuth();

  const [logoUrl, setLogoUrl] = useState(company.logoUrl || '/company_logo.jpg');
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um ficheiro de imagem válido (PNG, JPG, SVG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('A imagem do logótipo é muito grande (máximo 8MB).');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogoUrl(dataUrl);
        addToast('Logótipo carregado do ficheiro com sucesso!', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      setLogoUrl(customUrl.trim());
      setShowUrlField(false);
      setCustomUrl('');
      addToast('Endereço da imagem aplicado!', 'info');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateCompany({ logoUrl });
      addToast('Logótipo da empresa atualizado com sucesso!', 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar novo logótipo da empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setLogoUrl('/company_logo.jpg');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Identidade Visual da Empresa
            </span>
          </div>
          <h2 className="text-lg font-black tracking-tight mt-1">Alterar Logótipo & Imagem da Empresa</h2>
          <p className="text-xs text-blue-100/80 mt-0.5">
            O novo logótipo será exibido no cabeçalho do sistema, contratos, recibos de vencimento e relatórios em PDF.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Logo Preview Showcase */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
            <div className="w-28 h-28 rounded-2xl bg-white border-2 border-slate-300/80 shadow-md overflow-hidden p-2 flex items-center justify-center">
              <img
                src={logoUrl}
                alt={company.companyName}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as any).src = '/company_logo.jpg';
                }}
              />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 block truncate max-w-sm">
                {company.companyName || 'Empresa'}
              </span>
              <span className="text-[11px] text-slate-500">
                Pré-visualização em tamanho real no sistema
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer text-xs"
              >
                <Upload className="w-4 h-4" />
                Carregar Imagem do Computador
              </button>

              <button
                type="button"
                onClick={() => setShowUrlField(!showUrlField)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-2 cursor-pointer text-xs"
              >
                <LinkIcon className="w-4 h-4 text-slate-500" />
                Inserir Link / URL
              </button>

              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3 py-2.5 text-slate-500 hover:text-slate-800 font-semibold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                title="Repor logótipo original"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Repor Padrão
              </button>
            </div>

            {showUrlField && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://exemplo.com/logotipo-empresa.png"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Corporate Presets */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Ou escolha um logótipo institucional:
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COMPANY_LOGOS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLogoUrl(url)}
                    className={`h-16 rounded-xl border-2 p-1.5 bg-white transition-all flex items-center justify-center cursor-pointer ${
                      logoUrl === url
                        ? 'border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'A guardar...' : 'Guardar Novo Logótipo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
