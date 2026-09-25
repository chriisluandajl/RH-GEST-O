import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { ContractTemplate } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Plus, Edit2, FileText, Check } from 'lucide-react';

interface ContractTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContractTemplateModal: React.FC<ContractTemplateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addToast } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingType, setEditingType] = useState<string>('TEMPO_INDETERMINADO');
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    try {
      const data = await api.getContractTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
        setEditingTitle(data[0].title);
        setEditingContent(data[0].content);
        setEditingType(data[0].type);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const handleSelect = (t: ContractTemplate) => {
    setSelectedTemplate(t);
    setEditingTitle(t.title);
    setEditingContent(t.content);
    setEditingType(t.type);
  };

  const handleInsertTag = (tag: string) => {
    setEditingContent((prev) => prev + ` ${tag} `);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createContractTemplate({
        title: editingTitle,
        content: editingContent,
        type: editingType as any,
      });
      await loadTemplates();
      addToast('Modelo de contrato guardado com êxito.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Erro ao salvar modelo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const variables = [
    '{{NOME_FUNCIONARIO}}',
    '{{BI}}',
    '{{NIF}}',
    '{{CARGO}}',
    '{{DEPARTAMENTO}}',
    '{{SALARIO}}',
    '{{DATA_INICIO}}',
    '{{DATA_FIM}}',
    '{{MORADA}}',
    '{{NOME_EMPRESA}}',
    '{{NIF_EMPRESA}}',
    '{{ENDERECO_EMPRESA}}',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestão de Modelos de Contratos de Trabalho"
      subtitle="Defina minutas padronizadas e termos legais com preenchimento dinâmico"
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {saving ? 'A guardar...' : 'Guardar Modelo'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        {/* Templates List Sidebar */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Modelos Existentes
            </span>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start gap-2 ${
                  selectedTemplate?.id === t.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'hover:bg-slate-200/60 text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="truncate">{t.title}</div>
                  <div
                    className={`text-[10px] ${
                      selectedTemplate?.id === t.id ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {t.type}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Título do Modelo</label>
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Contrato</label>
              <select
                value={editingType}
                onChange={(e) => setEditingType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TEMPO_INDETERMINADO">Tempo Indeterminado</option>
                <option value="TERMO_CERTO">Termo Certo</option>
                <option value="TERMO_INCERTO">Termo Incerto</option>
                <option value="PRESTACAO_SERVICOS">Prestação de Serviços</option>
                <option value="ESTAGIO">Estágio Profissional</option>
              </select>
            </div>
          </div>

          {/* Quick Insert Variables Tags */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70">
            <span className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1.5">
              Inserir Marcadores de Dados (clique para adicionar):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-800 font-mono text-[10px] rounded border border-blue-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Corpo e Cláusulas Contratuais
            </label>
            <textarea
              rows={12}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
