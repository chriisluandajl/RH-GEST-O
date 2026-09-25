import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, FileText, Folder, Building, X, ArrowRight } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Employee, Contract, DocumentItem, Department } from '../../types/index.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (module: string, itemId?: string) => void;
  onSelectResult?: (type: string, id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    employees: Employee[];
    contracts: Contract[];
    documents: DocumentItem[];
    departments: Department[];
  }>({
    employees: [],
    contracts: [],
    documents: [],
    departments: [],
  });

  const handleSelect = (type: string, id: string) => {
    if (onSelectResult) {
      onSelectResult(type, id);
    } else if (onNavigate) {
      onNavigate(type, id);
    }
    onClose();
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults({ employees: [], contracts: [], documents: [], departments: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.globalSearch(query.trim());
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const hasResults =
    results.employees.length > 0 ||
    results.contracts.length > 0 ||
    results.documents.length > 0 ||
    results.departments.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center pt-20 p-4">
        <div
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search bar input */}
          <div className="relative border-b border-slate-200 flex items-center px-4 py-3.5 bg-slate-50/50">
            <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
            <input
              type="text"
              autoFocus
              placeholder="Pesquisar por funcionário, número de contrato, documento, BI, NIF..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-base focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 p-1 mr-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-slate-500 bg-slate-200/70 border border-slate-300 rounded-md">
              ESC
            </kbd>
          </div>

          {/* Results Container */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 text-sm">
            {loading && (
              <div className="py-8 text-center text-slate-400 text-sm">
                A pesquisar registos no sistema...
              </div>
            )}

            {!loading && !query && (
              <div className="py-10 text-center text-slate-400">
                <p className="text-sm font-medium">Escreva pelo menos 2 caracteres para pesquisar</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pode pesquisar nomes, códigos, números de BI, NIF ou departamentos.
                </p>
              </div>
            )}

            {!loading && query && !hasResults && (
              <div className="py-10 text-center text-slate-500">
                Nenhum resultado encontrado para &quot;{query}&quot;.
              </div>
            )}

            {/* Employees Results */}
            {results.employees.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-blue-500" /> Funcionários ({results.employees.length})
                </div>
                <div className="space-y-1">
                  {results.employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => handleSelect('employees', emp.id)}
                      className="p-2.5 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.photoUrl}
                          alt={emp.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-2">
                            {emp.fullName}
                            <span className="text-[11px] font-mono text-slate-400">{emp.code}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {emp.positionName} • {emp.departmentName} • BI: {emp.idNumber}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contracts Results */}
            {results.contracts.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" /> Contratos ({results.contracts.length})
                </div>
                <div className="space-y-1">
                  {results.contracts.map((cnt) => (
                    <div
                      key={cnt.id}
                      onClick={() => handleSelect('contracts', cnt.id)}
                      className="p-2.5 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {cnt.contractNumber}
                          <span className="text-xs font-normal text-slate-500">({cnt.typeName})</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {cnt.employeeName} • Início: {cnt.startDate} {cnt.endDate ? `até ${cnt.endDate}` : ''}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Results */}
            {results.documents.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-500" /> Documentos ({results.documents.length})
                </div>
                <div className="space-y-1">
                  {results.documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleSelect('documents', doc.id)}
                      className="p-2.5 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{doc.name}</div>
                        <div className="text-xs text-slate-500">
                          {doc.categoryName} • {doc.employeeName || 'Empresa'} • {doc.folderPath}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Departments */}
            {results.departments.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-500" /> Departamentos ({results.departments.length})
                </div>
                <div className="space-y-1">
                  {results.departments.map((dept) => (
                    <div
                      key={dept.id}
                      onClick={() => handleSelect('settings', 'departments')}
                      className="p-2.5 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{dept.name}</div>
                        <div className="text-xs text-slate-500">
                          Código: {dept.code} • Responsável: {dept.managerName || 'Não atribuído'}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
