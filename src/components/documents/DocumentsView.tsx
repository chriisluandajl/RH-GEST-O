import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  FileDown,
  Search,
  Filter,
  FileText,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
} from 'lucide-react';
import { DocumentItem, Employee, DocumentCategoryMeta } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { Modal } from '../common/Modal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatDate } from '../../utils/exportUtils.ts';

interface DocumentsViewProps {
  initialSubModule?: string;
  initialEmployeeId?: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  initialSubModule,
  initialEmployeeId,
}) => {
  const { hasPermission, addToast, isEmployeeOnly, currentEmployee, user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<DocumentCategoryMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    employeeId: initialEmployeeId || '',
    categoryId: '',
    name: '',
    fileName: '',
    fileSize: '1.2 MB',
    fileType: 'application/pdf',
    expiryDate: '',
    notes: '',
  });

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dList, eList, cList] = await Promise.all([
        api.getDocuments(),
        api.getEmployees(),
        api.getDocumentCategories(),
      ]);
      setDocuments(dList);
      setEmployees(eList);
      setCategories(cList);
      if (cList.length > 0 && !uploadData.categoryId) {
        setUploadData((prev) => ({ ...prev, categoryId: cList[0].id }));
      }
    } catch (err) {
      console.error(err);
      addToast('Erro ao carregar documentos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialSubModule === 'anexar' || initialEmployeeId) {
      if (initialEmployeeId) {
        setUploadData((prev) => ({ ...prev, employeeId: initialEmployeeId }));
      }
      setIsUploadOpen(true);
    }
  }, [initialSubModule, initialEmployeeId]);

  const handleFileUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadData((prev) => ({
        ...prev,
        fileName: file.name,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        fileType: file.type || 'application/pdf',
      }));
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.employeeId || !uploadData.name) {
      addToast('Selecione o colaborador e indique o nome do documento.', 'warning');
      return;
    }

    try {
      await api.createDocument({
        ...uploadData,
        fileName: uploadData.fileName || `${uploadData.name}.pdf`,
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        status: 'VALIDO',
      });
      addToast('Documento anexado com sucesso!', 'success');
      setIsUploadOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao anexar documento.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    try {
      await api.deleteDocument(docToDelete.id);
      addToast('Documento eliminado com sucesso.', 'info');
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao eliminar documento.', 'error');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    // Sigilo: Colaborador só visualiza os seus próprios documentos
    if (isEmployeeOnly) {
      const myId = currentEmployee?.id || user?.employeeId;
      if (doc.employeeId !== myId) return false;
    }

    if (selectedCategory && doc.categoryId !== selectedCategory && doc.categoryName !== selectedCategory) {
      return false;
    }
    if (selectedStatus && doc.status !== selectedStatus) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const mName = doc.name.toLowerCase().includes(q);
      const mEmp = (doc.employeeName || '').toLowerCase().includes(q);
      const mCat = doc.categoryName.toLowerCase().includes(q);
      const mFile = doc.fileName.toLowerCase().includes(q);
      return mName || mEmp || mCat || mFile;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestão Documental & Anexos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              {filteredDocs.length} Arquivos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Repositório digital de BI, NIF, atestados médicos, certidões, currículos e contratos assinados.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('canUploadDocuments') && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Anexar Novo Documento
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar documento, colaborador ou ficheiro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            >
              <option value="">Todos os Estados</option>
              <option value="VALIDO">Válido</option>
              <option value="A_EXPIRAR">A Expirar</option>
              <option value="EXPIRADO">Expirado</option>
              <option value="PENDENTE">Pendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            A carregar documentos...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            Nenhum documento encontrado para a pesquisa selecionada.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{doc.name}</h3>
                      <p className="text-[11px] text-slate-400">{doc.categoryName}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} type="document" />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Colaborador:</span>
                    <strong className="text-slate-900">{doc.employeeName}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Ficheiro:</span>
                    <span className="font-mono">{doc.fileName}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Tamanho:</span>
                    <span>{doc.fileSize}</span>
                  </div>
                  {doc.expiryDate && (
                    <div className="flex justify-between text-slate-500">
                      <span>Validade:</span>
                      <span className="font-semibold text-amber-700">{formatDate(doc.expiryDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  Carregado em {formatDate(doc.uploadDate)}
                </span>
                <div className="flex items-center gap-1">
                  <a
                    href={doc.fileUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Visualizar Documento"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  {hasPermission('canDeleteDocuments') && (
                    <button
                      onClick={() => {
                        setDocToDelete(doc);
                        setIsDeleteOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar Documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Anexar Documento */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Anexar Documento ao Colaborador"
        subtitle="Carregue cópias digitais e defina prazos de validade documental"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveDocument}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Anexar Ficheiro
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveDocument} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Colaborador <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={uploadData.employeeId}
              onChange={(e) => setUploadData((prev) => ({ ...prev, employeeId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="">Selecione o colaborador...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.code}) — {e.positionName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoria do Arquivo</label>
              <select
                value={uploadData.categoryId}
                onChange={(e) => setUploadData((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data de Validade (se houver)</label>
              <input
                type="date"
                value={uploadData.expiryDate}
                onChange={(e) => setUploadData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Título Descritivo do Documento <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Cópia autenticada do BI, Certificado de Licenciatura..."
              value={uploadData.name}
              onChange={(e) => setUploadData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Carregar Ficheiro Digital</label>
            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-colors">
              <Upload className="w-8 h-8 text-blue-600 mb-2" />
              <span className="font-semibold text-slate-700">
                {uploadData.fileName ? uploadData.fileName : 'Clique para selecionar ou arraste o ficheiro'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                PDF, PNG, JPG ou DOCX até 25MB
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileUploadSim}
              />
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observações Internas</label>
            <textarea
              rows={2}
              value={uploadData.notes}
              onChange={(e) => setUploadData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Anotações de conferência..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Documento"
        message={`Tem a certeza que deseja eliminar o documento "${docToDelete?.name}"? O arquivo digital será removido do registo do colaborador.`}
        confirmText="Sim, Eliminar"
        isDestructive
      />
    </div>
  );
};
