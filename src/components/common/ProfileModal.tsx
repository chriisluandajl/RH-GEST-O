import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  User as UserIcon,
  Camera,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Shield,
  IdCard,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, currentUser, updateUserProfile, addToast, isEmployeeOnly, currentEmployee } = useAuth();
  const activeUser = user || currentUser;

  const [name, setName] = useState(activeUser?.name || '');
  const [email, setEmail] = useState(activeUser?.email || '');
  const [avatar, setAvatar] = useState(activeUser?.avatar || '');

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !activeUser) return null;

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um ficheiro de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem selecionada é muito pesada (máximo 5MB).');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setAvatar(result);
        addToast('Nova foto carregada com sucesso!', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (customUrlInput.trim()) {
      setAvatar(customUrlInput.trim());
      setShowUrlInput(false);
      setCustomUrlInput('');
      addToast('Link da imagem aplicado!', 'info');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password if changing
    if (isChangingPassword) {
      if (!newPassword.trim()) {
        setError('Por favor, informe a nova palavra-passe.');
        return;
      }
      if (newPassword.trim().length < 3) {
        setError('A nova palavra-passe deve ter pelo menos 3 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('A confirmação da nova palavra-passe não coincide.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        email: email.trim(),
        avatar,
        currentPassword: isChangingPassword ? currentPassword.trim() : undefined,
        newPassword: isChangingPassword ? newPassword.trim() : undefined,
      });

      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar alterações do perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {isEmployeeOnly ? 'Portal do Colaborador' : 'Perfil Administrativo'}
            </span>
            {activeUser.employeeCode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/30 text-blue-200 font-bold">
                Cód: {activeUser.employeeCode}
              </span>
            )}
          </div>

          <h2 className="text-lg font-black tracking-tight mt-1">Meu Perfil, Foto & Senha</h2>
          <p className="text-xs text-blue-100/80 mt-0.5">
            Personalize a sua foto de exibição e mantenha a sua palavra-passe confidencial.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Photo & Avatar Selection */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                Fotografia de Perfil
              </span>
              <span className="text-[11px] text-slate-500">Visível em relatórios e recibos</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:brightness-90 transition-all"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                >
                  <Camera className="w-5 h-5 mb-0.5" />
                  Trocar
                </button>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Carregar do Computador
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                    Inserir Link
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Formatos aceites: JPG, PNG ou WEBP. A foto é guardada de imediato no sistema.
                </p>
              </div>
            </div>

            {/* Custom URL Input dropdown */}
            {showUrlInput && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://exemplo.com/minha-foto.jpg"
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Preset Avatars */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Ou selecione um avatar profissional:
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatar(url)}
                    className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      avatar === url
                        ? 'border-blue-600 scale-110 shadow-sm'
                        : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Account Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs">Identificação do Utilizador</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">Nível de Acesso no Sistema:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {activeUser.role} {isEmployeeOnly ? '• Modo Individual' : '• Painel Global'}
                </span>
              </div>
              {activeUser.employeeCode && (
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Código Interno:</span>
                  <span className="font-mono font-bold text-blue-700 text-xs">
                    {activeUser.employeeCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Password Change */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  Segurança & Palavra-passe
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  A sua senha padrão é o seu Código do Sistema e pode ser alterada aqui.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                  isChangingPassword
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {isChangingPassword ? 'Cancelar Alteração' : 'Alterar Palavra-passe'}
              </button>
            </div>

            {isChangingPassword && (
              <div className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Palavra-passe Atual (Para validação)
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Introduza a sua senha atual (ou seu Código do Sistema)"
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Se nunca alterou, a senha atual é o seu Código de Funcionário (ex:{' '}
                    {activeUser.employeeCode || 'EMP-001'}).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nova Palavra-passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 3 caracteres"
                        className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Confirmar Nova Palavra-passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'A guardar...' : 'Guardar Alterações do Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
