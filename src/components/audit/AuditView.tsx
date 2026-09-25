import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  FileDown,
  Printer,
  Shield,
  User,
  Clock,
  Calendar,
} from 'lucide-react';
import { AuditLog } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToExcel, formatDate, printElement } from '../../utils/exportUtils.ts';

export const AuditView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        module: selectedModule || undefined,
        action: selectedAction || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedModule, selectedAction]);

  const filteredLogs = logs.filter((log) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const mUser = log.userName.toLowerCase().includes(q);
      const mDetails = log.details.toLowerCase().includes(q);
      const mRecord = log.recordId?.toLowerCase().includes(q) || false;
      const mModule = (log.module || log.entity || '').toLowerCase().includes(q);
      return mUser || mDetails || mRecord || mModule;
    }
    return true;
  });

  const handleExportExcel = () => {
    const data = filteredLogs.map((l) => ({
      Data: l.timestamp,
      Utilizador: l.userName,
      Módulo: l.module || l.entity,
      Ação: l.action,
      'Registo ID': l.recordId || l.entityId || '-',
      Detalhes: l.details,
      IP: l.ipAddress || '127.0.0.1',
    }));
    exportToExcel(data, `Logs_Auditoria_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Histórico de Operações & Trilha de Auditoria
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              {filteredLogs.length} Registos de Log
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rastreabilidade de todas as ações de criação, edição, eliminação, exportação e acesso realizadas no sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={() => printElement('audit-logs-table', 'Trilha de Auditoria')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar por utilizador, detalhes ou registo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            >
              <option value="">Todos os Módulos</option>
              <option value="FUNCIONARIOS">Funcionários</option>
              <option value="CONTRATOS">Contratos</option>
              <option value="DOCUMENTOS">Documentos</option>
              <option value="FERIAS">Férias</option>
              <option value="FALTAS">Faltas</option>
              <option value="SALARIOS">Salários</option>
              <option value="SISTEMA">Configurações & Sistema</option>
            </select>
          </div>

          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            >
              <option value="">Todas as Ações</option>
              <option value="CRIAR">Criar Registo</option>
              <option value="EDITAR">Editar / Atualizar</option>
              <option value="ELIMINAR">Eliminar</option>
              <option value="VISUALIZAR">Visualizar</option>
              <option value="IMPRIMIR">Imprimir</option>
              <option value="EXPORTAR">Exportar Excel</option>
              <option value="LOGIN">Autenticação / Login</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div id="audit-logs-table" className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Utilizador Responsável</th>
                <th className="py-3 px-4">Módulo</th>
                <th className="py-3 px-4">Operação</th>
                <th className="py-3 px-4">Descrição da Operação</th>
                <th className="py-3 px-4">Endereço IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    A carregar trilha de auditoria...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum log encontrado para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const getActionBadgeColor = (action: string) => {
                    switch (action) {
                      case 'CRIAR':
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      case 'EDITAR':
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                      case 'ELIMINAR':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      case 'EXPORTAR':
                      case 'IMPRIMIR':
                        return 'bg-purple-50 text-purple-700 border-purple-200';
                      default:
                        return 'bg-slate-100 text-slate-700 border-slate-200';
                    }
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Data */}
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {log.timestamp.replace('T', ' ').substring(0, 19)}
                      </td>

                      {/* Utilizador */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {log.userName}
                        </div>
                      </td>

                      {/* Módulo */}
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {log.module || log.entity}
                      </td>

                      {/* Operação */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Detalhes */}
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {log.details}
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ipAddress || '192.168.1.105'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
