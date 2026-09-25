import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Contract, ContractTemplate } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useCompany } from '../../context/CompanyContext.tsx';
import { printElement } from '../../utils/exportUtils.ts';
import { Printer, Download, CheckCircle2 } from 'lucide-react';

interface ContractPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSignedToggle?: (contractId: string, isSigned: boolean) => void;
}

export const ContractPrintModal: React.FC<ContractPrintModalProps> = ({
  isOpen,
  onClose,
  contract,
  onSignedToggle,
}) => {
  const { company } = useCompany();
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const tList = await api.getContractTemplates();
        setTemplates(tList);
        if (tList.length > 0) {
          const match = tList.find((t) => t.type === contract?.type) || tList[0];
          setSelectedTemplateId(match.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (isOpen && contract) {
      loadTemplates();
    }
  }, [isOpen, contract]);

  useEffect(() => {
    const render = async () => {
      if (!contract || !selectedTemplateId) return;
      setLoading(true);
      try {
        const res = await api.renderContractTemplate(selectedTemplateId, contract.employeeId);
        setRenderedContent(res.rendered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    render();
  }, [contract, selectedTemplateId]);

  if (!isOpen || !contract) return null;

  const handlePrint = () => {
    printElement('contract-document-render', `Contrato-${contract.contractNumber}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Minuta Contratual: ${contract.contractNumber}`}
      subtitle={`Colaborador: ${contract.employeeName} (${contract.employeeCode}) • Regime: ${contract.typeName}`}
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {onSignedToggle && (
              <button
                type="button"
                onClick={() => onSignedToggle(contract.id, !contract.isSigned)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  contract.isSigned
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {contract.isSigned ? 'Marcado como Assinado' : 'Marcar como Assinado'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar em PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Template Selector */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Modelo Aplicado:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <span className="text-slate-400 text-[11px]">
            Variáveis {'{{NOME_FUNCIONARIO}}'}, {'{{SALARIO}}'}, etc. substituídas em tempo real
          </span>
        </div>

        {/* Visual Document Canvas */}
        <div
          id="contract-document-render"
          className="bg-white p-8 sm:p-12 border border-slate-300 rounded-xl shadow-inner font-serif text-slate-900 leading-relaxed text-sm max-h-[60vh] overflow-y-auto"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-sans">A compor contrato oficial...</div>
          ) : (
            <div className="space-y-6">
              {/* Header Letterhead */}
              <div className="text-center border-b-2 border-slate-900 pb-4 font-sans">
                <h1 className="text-xl font-bold tracking-wide uppercase text-slate-900">
                  {company.companyName}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  NIF: {company.nif} • Reg. Comercial: {company.commercialRegistryNumber}
                </p>
                <p className="text-xs text-slate-600">
                  {company.address} • {company.province}, {company.country || 'Angola'}
                </p>
              </div>

              {/* Title */}
              <div className="text-center py-2">
                <h2 className="text-lg font-bold uppercase underline tracking-wider font-sans">
                  CONTRATO DE TRABALHO POR {contract.typeName.toUpperCase()}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1">Nº: {contract.contractNumber}</p>
              </div>

              {/* Body Text */}
              <div className="whitespace-pre-line text-xs sm:text-sm text-justify leading-relaxed">
                {renderedContent}
              </div>

              {/* Signature Blocks */}
              <div className="pt-16 pb-6 grid grid-cols-2 gap-8 text-center text-xs font-sans">
                <div>
                  <div className="border-t border-slate-900 pt-2 font-bold uppercase">
                    PELA EMPREGADORA
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {company.legalRepresentative || 'Administração / Recursos Humanos'}
                  </p>
                  <p className="text-slate-400 text-[10px]">Data: ____ / ____ / ________</p>
                </div>

                <div>
                  <div className="border-t border-slate-900 pt-2 font-bold uppercase">
                    O(A) TRABALHADOR(A)
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">{contract.employeeName}</p>
                  <p className="text-slate-400 text-[10px]">Data: ____ / ____ / ________</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
