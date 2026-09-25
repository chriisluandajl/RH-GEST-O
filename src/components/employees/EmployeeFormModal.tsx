import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Employee, Department, Position } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useCompany } from '../../context/CompanyContext.tsx';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (employee: Employee) => void;
  employeeToEdit?: Employee | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  employeeToEdit,
}) => {
  const { visual } = useCompany();
  const [activeTab, setActiveTab] = useState<'pessoal' | 'profissional' | 'bancario' | 'emergencia'>('pessoal');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    fullName: '',
    nickname: '',
    gender: 'MASCULINO',
    birthDate: '1992-05-15',
    nationality: 'Angolana',
    maritalStatus: 'SOLTEIRO',
    idNumber: '',
    idIssueDate: '2020-01-10',
    idExpiryDate: '2030-01-10',
    nif: '',
    phone: '',
    email: '',
    address: '',
    municipality: 'Luanda',
    province: 'Luanda',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    departmentId: '',
    positionId: '',
    jobRole: '',
    admissionDate: new Date().toISOString().split('T')[0],
    contractType: 'TEMPO_INDETERMINADO',
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    status: 'ATIVO',
    baseSalary: 450000,
    bankName: 'Banco Angolano de Investimentos (BAI)',
    accountNumber: '',
    iban: '',
    socialSecurityNumber: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    emergencyContactAddress: '',
    notes: '',
  });

  useEffect(() => {
    const loadDeptsAndPositions = async () => {
      try {
        const [dList, pList] = await Promise.all([api.getDepartments(), api.getPositions()]);
        setDepartments(dList);
        setPositions(pList);
        if (!employeeToEdit && dList.length > 0) {
          setFormData((prev) => ({
            ...prev,
            departmentId: prev.departmentId || dList[0].id,
            positionId: prev.positionId || pList[0]?.id || '',
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (isOpen) {
      loadDeptsAndPositions();
    }
  }, [isOpen, employeeToEdit]);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({ ...employeeToEdit });
    } else {
      setFormData({
        fullName: '',
        nickname: '',
        gender: 'MASCULINO',
        birthDate: '1992-05-15',
        nationality: 'Angolana',
        maritalStatus: 'SOLTEIRO',
        idNumber: '',
        idIssueDate: '2020-01-10',
        idExpiryDate: '2030-01-10',
        nif: '',
        phone: '',
        email: '',
        address: '',
        municipality: 'Luanda',
        province: 'Luanda',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        departmentId: departments[0]?.id || '',
        positionId: positions[0]?.id || '',
        jobRole: '',
        admissionDate: new Date().toISOString().split('T')[0],
        contractType: 'TEMPO_INDETERMINADO',
        contractStartDate: new Date().toISOString().split('T')[0],
        contractEndDate: '',
        status: 'ATIVO',
        baseSalary: 450000,
        bankName: 'Banco Angolano de Investimentos (BAI)',
        accountNumber: '',
        iban: '',
        socialSecurityNumber: '',
        emergencyContactName: '',
        emergencyContactRelation: '',
        emergencyContactPhone: '',
        emergencyContactAddress: '',
        notes: '',
      });
    }
    setError(null);
  }, [employeeToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.idNumber || !formData.departmentId || !formData.positionId) {
      setError('Por favor preencha os campos obrigatórios (Nome, BI, Departamento e Cargo).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (employeeToEdit) {
        const updated = await api.updateEmployee(employeeToEdit.id, formData);
        onSaved(updated);
      } else {
        const created = await api.createEmployee(formData);
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar funcionário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employeeToEdit ? `Editar Funcionário: ${employeeToEdit.fullName}` : 'Cadastrar Novo Funcionário'}
      subtitle="Preencha os dados cadastrais, profissionais e contratuais do colaborador"
      maxWidth="3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            {loading ? 'A guardar...' : employeeToEdit ? 'Salvar Alterações' : 'Concluir Cadastro'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 text-xs font-semibold gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('pessoal')}
            className={`pb-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'pessoal'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Dados Pessoais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profissional')}
            className={`pb-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'profissional'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Dados Profissionais & Cargo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bancario')}
            className={`pb-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'bancario'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Dados Bancários & SS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('emergencia')}
            className={`pb-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'emergencia'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            4. Contacto de Emergência
          </button>
        </div>

        {/* Tab 1: Dados Pessoais */}
        {activeTab === 'pessoal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName || ''}
                onChange={handleChange}
                placeholder="Ex: Carlos António da Silva"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nome Abreviado / Conhecido Por
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname || ''}
                onChange={handleChange}
                placeholder="Ex: Carlos Silva"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Género</label>
              <select
                name="gender"
                value={formData.gender || 'MASCULINO'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data de Nascimento</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nacionalidade</label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality || 'Angolana'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estado Civil</label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus || 'SOLTEIRO'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SOLTEIRO">Solteiro(a)</option>
                <option value="CASADO">Casado(a)</option>
                <option value="DIVORCIADO">Divorciado(a)</option>
                <option value="VIUVO">Viúvo(a)</option>
                <option value="UNIAO_DE_FACTO">União de Facto</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nº BI / Passaporte <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="idNumber"
                required
                value={formData.idNumber || ''}
                onChange={handleChange}
                placeholder="Ex: 004892184LA042"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Validade do BI</label>
              <input
                type="date"
                name="idExpiryDate"
                value={formData.idExpiryDate || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIF (Número Fiscal)</label>
              <input
                type="text"
                name="nif"
                value={formData.nif || ''}
                onChange={handleChange}
                placeholder="Ex: 004892184LA042"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefone Principal</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                placeholder="+244 923 000 000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="nome@empresa.ao"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Morada Residencial</label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                placeholder="Rua, Bairro, Edifício"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Município</label>
              <input
                type="text"
                name="municipality"
                value={formData.municipality || 'Luanda'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Província</label>
              <input
                type="text"
                name="province"
                value={formData.province || 'Luanda'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Dados Profissionais */}
        {activeTab === 'profissional' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Departamento <span className="text-rose-500">*</span>
              </label>
              <select
                name="departmentId"
                required
                value={formData.departmentId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o departamento...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cargo <span className="text-rose-500">*</span>
              </label>
              <select
                name="positionId"
                required
                value={formData.positionId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o cargo...</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Função / Especialidade</label>
              <input
                type="text"
                name="jobRole"
                value={formData.jobRole || ''}
                onChange={handleChange}
                placeholder="Ex: Engenheiro de Software Sénior"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data de Admissão</label>
              <input
                type="date"
                name="admissionDate"
                value={formData.admissionDate || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Contrato</label>
              <select
                name="contractType"
                value={formData.contractType || 'TEMPO_INDETERMINADO'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TEMPO_INDETERMINADO">Tempo Indeterminado (Efetivo)</option>
                <option value="TERMO_CERTO">Termo Certo (Determinado)</option>
                <option value="TERMO_INCERTO">Termo Incerto</option>
                <option value="PRESTACAO_SERVICOS">Prestação de Serviços</option>
                <option value="ESTAGIO">Estágio Profissional</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Salário Base Mensal ({visual.currencySymbol})
              </label>
              <input
                type="number"
                name="baseSalary"
                min="0"
                step="5000"
                value={formData.baseSalary || 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data Início Contrato</label>
              <input
                type="date"
                name="contractStartDate"
                value={formData.contractStartDate || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Data Término Contrato (se aplicável)
              </label>
              <input
                type="date"
                name="contractEndDate"
                value={formData.contractEndDate || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status do Colaborador</label>
              <select
                name="status"
                value={formData.status || 'ATIVO'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ATIVO">Ativo</option>
                <option value="EM_FERIAS">Em Férias</option>
                <option value="SUSPENSO">Suspenso</option>
                <option value="DESLIGADO">Desligado / Inativo</option>
              </select>
            </div>
          </div>
        )}

        {/* Tab 3: Bancário & Segurança Social */}
        {activeTab === 'bancario' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Instituição Bancária</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName || ''}
                onChange={handleChange}
                placeholder="Ex: Banco Angolano de Investimentos (BAI)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Número de Conta</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber || ''}
                onChange={handleChange}
                placeholder="Ex: 123456789"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">IBAN</label>
              <input
                type="text"
                name="iban"
                value={formData.iban || ''}
                onChange={handleChange}
                placeholder="Ex: AO06004000000000000000000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nº Segurança Social (INSS)</label>
              <input
                type="text"
                name="socialSecurityNumber"
                value={formData.socialSecurityNumber || ''}
                onChange={handleChange}
                placeholder="Ex: 1009823412"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Contacto de Emergência */}
        {activeTab === 'emergencia' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nome do Contacto</label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName || ''}
                onChange={handleChange}
                placeholder="Ex: Maria António Silva"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Grau de Parentesco</label>
              <input
                type="text"
                name="emergencyContactRelation"
                value={formData.emergencyContactRelation || ''}
                onChange={handleChange}
                placeholder="Ex: Cônjuge, Irmão, Pai/Mãe"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefone de Emergência</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone || ''}
                onChange={handleChange}
                placeholder="+244 923 000 000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Endereço de Emergência</label>
              <input
                type="text"
                name="emergencyContactAddress"
                value={formData.emergencyContactAddress || ''}
                onChange={handleChange}
                placeholder="Morada de residência do contacto"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Observações Internas</label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes || ''}
                onChange={handleChange}
                placeholder="Notas confidenciais de RH..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
