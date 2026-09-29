import {
  Employee,
  Contract,
  DocumentItem,
  Vacation,
  Absence,
  PayrollSheet,
  SalaryHistory,
  ContractTemplate,
  Department,
  Position,
  User,
  CompanySettings,
  VisualSettings,
  RolePermissions,
  AuditLog,
  NotificationItem,
} from '../types/index.ts';

const BASE_URL = '/api';

export const CACHE_KEYS = {
  EMPLOYEES: 'gestao_rh_employees_cache',
  CONTRACTS: 'gestao_rh_contracts_cache',
  DOCUMENTS: 'gestao_rh_documents_cache',
  VACATIONS: 'gestao_rh_vacations_cache',
  ABSENCES: 'gestao_rh_absences_cache',
  PAYROLL: 'gestao_rh_payroll_cache',
  DEPARTMENTS: 'gestao_rh_departments_cache',
  POSITIONS: 'gestao_rh_positions_cache',
  USERS: 'gestao_rh_users_cache',
  ROLES: 'gestao_rh_roles_cache',
  COMPANY: 'gestao_rh_company_settings',
  VISUAL: 'gestao_rh_visual_settings',
  FULL_SNAPSHOT: 'gestao_rh_full_database_snapshot',
};

function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return fallback;
}

function setLocalCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded or private mode
  }
}

async function fetchJSON<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const currentUserId = localStorage.getItem('gestao_rh_user_id') || 'usr-1';
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-id', currentUserId);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMessage = 'Ocorreu um erro ao processar o seu pedido.';
    try {
      const errorData = await res.json();
      if (errorData.error) errMessage = errorData.error;
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export const api = {
  // Auth
  login: async (email: string, password?: string) => {
    return fetchJSON<{ token: string; user: User; employee?: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  employeeLogin: async (identifier: string, password?: string) => {
    return fetchJSON<{ token: string; user: User; employee?: any }>('/auth/employee-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },
  updateProfile: async (data: {
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const res = await fetchJSON<{ success: boolean; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res?.user) {
      const users = getLocalCache<User[]>(CACHE_KEYS.USERS, []);
      setLocalCache(
        CACHE_KEYS.USERS,
        users.map((u) => (u.id === res.user.id ? { ...u, ...res.user } : u))
      );
    }
    return res;
  },
  getMe: () => fetchJSON<{ user: User }>('/auth/me'),
  getUsers: async () => {
    try {
      const list = await fetchJSON<User[]>('/auth/users');
      if (Array.isArray(list) && list.length > 0) {
        setLocalCache(CACHE_KEYS.USERS, list);
        return list;
      }
    } catch (err) {
      console.warn('Carregando utilizadores do armazenamento permanente local:', err);
    }
    return getLocalCache<User[]>(CACHE_KEYS.USERS, []);
  },
  createUser: async (data: Partial<User> & { password?: string }) => {
    try {
      const created = await fetchJSON<User>('/auth/users', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<User[]>(CACHE_KEYS.USERS, []);
      setLocalCache(CACHE_KEYS.USERS, [created, ...current.filter((u) => u.id !== created.id)]);
      return created;
    } catch (err) {
      const localUser: User = {
        id: `usr-${Date.now()}`,
        name: data.name || 'Novo Utilizador',
        email: data.email || '',
        role: data.role || 'UTILIZADOR',
        active: true,
        createdAt: new Date().toISOString(),
        ...data,
      };
      const current = getLocalCache<User[]>(CACHE_KEYS.USERS, []);
      setLocalCache(CACHE_KEYS.USERS, [localUser, ...current]);
      return localUser;
    }
  },
  updateUser: async (id: string, data: Partial<User>) => {
    try {
      const updated = await fetchJSON<User>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const current = getLocalCache<User[]>(CACHE_KEYS.USERS, []);
      setLocalCache(
        CACHE_KEYS.USERS,
        current.map((u) => (u.id === id ? { ...u, ...updated } : u))
      );
      return updated;
    } catch (err) {
      const current = getLocalCache<User[]>(CACHE_KEYS.USERS, []);
      const updated = current.map((u) => (u.id === id ? { ...u, ...data } : u));
      setLocalCache(CACHE_KEYS.USERS, updated);
      return updated.find((u) => u.id === id) as User;
    }
  },
  deleteUser: async (id: string) => {
    const current = getLocalCache<User[]>(CACHE_KEYS.USERS, []);
    setLocalCache(CACHE_KEYS.USERS, current.filter((u) => u.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/auth/users/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },
  getRoles: async () => {
    try {
      const res = await fetchJSON<RolePermissions[]>('/auth/roles');
      if (Array.isArray(res) && res.length > 0) {
        setLocalCache(CACHE_KEYS.ROLES, res);
        return res;
      }
    } catch (err) {
      console.warn('Carregando perfis do armazenamento local:', err);
    }
    return getLocalCache<RolePermissions[]>(CACHE_KEYS.ROLES, []);
  },
  updateRole: async (role: string, data: Partial<RolePermissions>) => {
    try {
      const res = await fetchJSON<RolePermissions>(`/auth/roles/${role}`, { method: 'PUT', body: JSON.stringify(data) });
      const current = getLocalCache<RolePermissions[]>(CACHE_KEYS.ROLES, []);
      setLocalCache(
        CACHE_KEYS.ROLES,
        current.map((r) => (r.role === role ? { ...r, ...res } : r))
      );
      return res;
    } catch (err) {
      const current = getLocalCache<RolePermissions[]>(CACHE_KEYS.ROLES, []);
      const updated = current.map((r) => (r.role === role ? { ...r, ...data } : r));
      setLocalCache(CACHE_KEYS.ROLES, updated);
      return updated.find((r) => r.role === role) as RolePermissions;
    }
  },

  // Dashboard
  getDashboardStats: () =>
    fetchJSON<{
      metrics: {
        totalEmployees: number;
        activeEmployees: number;
        activeContracts: number;
        contractsEndingSoon: number;
        expiredContracts: number;
        onVacationEmployees: number;
        currentMonthAbsences: number;
        monthlyPayrollTotal: number;
        totalDocuments: number;
        expiredDocuments: number;
        pendingDocuments: number;
      };
      charts: {
        employeesByDepartment: { department: string; count: number }[];
        employeesByPosition: { position: string; count: number }[];
        absenceBreakdown: { type: string; count: number }[];
        vacationsStatusBreakdown: { name: string; count: number; color: string }[];
        payrollTrend: { month: string; gross: number; net: number }[];
      };
    }>('/dashboard/stats'),

  // Employees
  getEmployees: async (params?: { department?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.department) query.set('department', params.department);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    try {
      const list = await fetchJSON<Employee[]>(`/employees${qs}`);
      if (Array.isArray(list)) {
        if (!params?.department && !params?.status && !params?.search) {
          setLocalCache(CACHE_KEYS.EMPLOYEES, list);
        }
        return list;
      }
    } catch (err) {
      console.warn('Carregando colaboradores do armazenamento permanente local:', err);
    }

    let cached = getLocalCache<Employee[]>(CACHE_KEYS.EMPLOYEES, []);
    if (params?.department) {
      cached = cached.filter((e) => e.departmentId === params.department || e.departmentName === params.department);
    }
    if (params?.status) {
      cached = cached.filter((e) => e.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      cached = cached.filter((e) => e.fullName.toLowerCase().includes(q) || e.code.toLowerCase().includes(q));
    }
    return cached;
  },
  getEmployeeById: (id: string) =>
    fetchJSON<
      Employee & {
        contracts: Contract[];
        documents: DocumentItem[];
        vacations: Vacation[];
        absences: Absence[];
        salaryHistory: SalaryHistory[];
      }
    >(`/employees/${id}`),
  createEmployee: async (data: Partial<Employee>) => {
    try {
      const res = await fetchJSON<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<Employee[]>(CACHE_KEYS.EMPLOYEES, []);
      setLocalCache(CACHE_KEYS.EMPLOYEES, [res, ...current.filter((e) => e.id !== res.id)]);
      return res;
    } catch (err) {
      const localEmp: Employee = {
        id: `emp-${Date.now()}`,
        code: data.code || `EMP-${Date.now().toString().slice(-3)}`,
        fullName: data.fullName || 'Colaborador',
        nickname: data.nickname || '',
        gender: data.gender || 'MASCULINO',
        birthDate: data.birthDate || '1990-01-01',
        nationality: data.nationality || 'Angolana',
        maritalStatus: data.maritalStatus || 'SOLTEIRO',
        idNumber: data.idNumber || '',
        idIssueDate: data.idIssueDate || '',
        idExpiryDate: data.idExpiryDate || '',
        nif: data.nif || data.idNumber || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        municipality: data.municipality || 'Luanda',
        province: data.province || 'Luanda',
        photoUrl: data.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        positionId: data.positionId || '',
        positionName: data.positionName || 'Colaborador',
        departmentId: data.departmentId || '',
        departmentName: data.departmentName || 'Geral',
        jobRole: data.jobRole || 'Colaborador',
        admissionDate: data.admissionDate || new Date().toISOString().split('T')[0],
        contractType: data.contractType || 'TEMPO_INDETERMINADO',
        contractStartDate: data.contractStartDate || new Date().toISOString().split('T')[0],
        contractEndDate: data.contractEndDate,
        status: data.status || 'ATIVO',
        baseSalary: Number(data.baseSalary) || 450000,
        bankName: data.bankName || 'Banco Angolano de Investimentos (BAI)',
        accountNumber: data.accountNumber || '',
        iban: data.iban || '',
        socialSecurityNumber: data.socialSecurityNumber || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactRelation: data.emergencyContactRelation || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        emergencyContactAddress: data.emergencyContactAddress || '',
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = getLocalCache<Employee[]>(CACHE_KEYS.EMPLOYEES, []);
      setLocalCache(CACHE_KEYS.EMPLOYEES, [localEmp, ...current]);
      return localEmp;
    }
  },
  updateEmployee: async (id: string, data: Partial<Employee>) => {
    try {
      const res = await fetchJSON<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const current = getLocalCache<Employee[]>(CACHE_KEYS.EMPLOYEES, []);
      setLocalCache(
        CACHE_KEYS.EMPLOYEES,
        current.map((e) => (e.id === id ? { ...e, ...res } : e))
      );
      return res;
    } catch (err) {
      const current = getLocalCache<Employee[]>(CACHE_KEYS.EMPLOYEES, []);
      const updated = current.map((e) => (e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e));
      setLocalCache(CACHE_KEYS.EMPLOYEES, updated);
      return updated.find((e) => e.id === id) as Employee;
    }
  },
  deleteEmployee: async (id: string) => {
    const current = getLocalCache<Employee[]>(CACHE_KEYS.EMPLOYEES, []);
    setLocalCache(CACHE_KEYS.EMPLOYEES, current.filter((e) => e.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/employees/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },

  // Contracts
  getContracts: async (params?: { status?: string; employeeId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    try {
      const res = await fetchJSON<Contract[]>(`/contracts${qs}`);
      if (Array.isArray(res)) {
        if (!params?.status && !params?.employeeId && !params?.search) {
          setLocalCache(CACHE_KEYS.CONTRACTS, res);
        }
        return res;
      }
    } catch (err) {
      console.warn('Carregando contratos do armazenamento permanente local:', err);
    }

    let cached = getLocalCache<Contract[]>(CACHE_KEYS.CONTRACTS, []);
    if (params?.status) cached = cached.filter((c) => c.status === params.status);
    if (params?.employeeId) cached = cached.filter((c) => c.employeeId === params.employeeId);
    return cached;
  },
  getContractById: (id: string) => fetchJSON<Contract>(`/contracts/${id}`),
  createContract: async (data: Partial<Contract>) => {
    try {
      const res = await fetchJSON<Contract>('/contracts', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<Contract[]>(CACHE_KEYS.CONTRACTS, []);
      setLocalCache(CACHE_KEYS.CONTRACTS, [res, ...current.filter((c) => c.id !== res.id)]);
      return res;
    } catch (err) {
      const localContract: Contract = {
        id: `cnt-${Date.now()}`,
        contractNumber: `CTR-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
        employeeId: data.employeeId || '',
        employeeName: data.employeeName || 'Colaborador',
        employeeCode: data.employeeCode || '',
        departmentName: data.departmentName || '',
        positionName: data.positionName || '',
        type: data.type || 'TEMPO_INDETERMINADO',
        typeName: data.typeName || 'Tempo Indeterminado',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate,
        baseSalary: Number(data.baseSalary) || 450000,
        status: data.status || 'ATIVO',
        isSigned: data.isSigned || false,
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        ...data,
      } as Contract;
      const current = getLocalCache<Contract[]>(CACHE_KEYS.CONTRACTS, []);
      setLocalCache(CACHE_KEYS.CONTRACTS, [localContract, ...current]);
      return localContract;
    }
  },
  updateContract: async (id: string, data: Partial<Contract>) => {
    try {
      const res = await fetchJSON<Contract>(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const current = getLocalCache<Contract[]>(CACHE_KEYS.CONTRACTS, []);
      setLocalCache(
        CACHE_KEYS.CONTRACTS,
        current.map((c) => (c.id === id ? { ...c, ...res } : c))
      );
      return res;
    } catch (err) {
      const current = getLocalCache<Contract[]>(CACHE_KEYS.CONTRACTS, []);
      const updated = current.map((c) => (c.id === id ? { ...c, ...data } : c));
      setLocalCache(CACHE_KEYS.CONTRACTS, updated);
      return updated.find((c) => c.id === id) as Contract;
    }
  },
  deleteContract: async (id: string) => {
    const current = getLocalCache<Contract[]>(CACHE_KEYS.CONTRACTS, []);
    setLocalCache(CACHE_KEYS.CONTRACTS, current.filter((c) => c.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/contracts/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },
  renewContract: (id: string, data: { newEndDate: string; newSalary?: number; notes?: string }) =>
    fetchJSON<Contract>(`/contracts/${id}/renew`, { method: 'POST', body: JSON.stringify(data) }),
  terminateContract: (id: string, data: { reason?: string }) =>
    fetchJSON<Contract>(`/contracts/${id}/terminate`, { method: 'POST', body: JSON.stringify(data) }),
  duplicateContract: (id: string) =>
    fetchJSON<Contract>(`/contracts/${id}/duplicate`, { method: 'POST' }),
  renderContractTemplate: (templateId: string, employeeId: string) =>
    fetchJSON<{
      rendered: string;
      template: ContractTemplate;
      employee: Employee;
      company: CompanySettings;
    }>('/contracts/render-template', {
      method: 'POST',
      body: JSON.stringify({ templateId, employeeId }),
    }),

  // Contract Templates
  getContractTemplates: () => fetchJSON<ContractTemplate[]>('/contract-templates'),
  createContractTemplate: (data: Partial<ContractTemplate>) =>
    fetchJSON<ContractTemplate>('/contract-templates', { method: 'POST', body: JSON.stringify(data) }),

  // Documents
  getDocuments: async (params?: { employeeId?: string; category?: string; status?: string; folder?: string }) => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.folder) query.set('folder', params.folder);
    const qs = query.toString() ? `?${query.toString()}` : '';

    try {
      const res = await fetchJSON<DocumentItem[]>(`/documents${qs}`);
      if (Array.isArray(res)) {
        if (!params?.employeeId && !params?.category && !params?.status && !params?.folder) {
          setLocalCache(CACHE_KEYS.DOCUMENTS, res);
        }
        return res;
      }
    } catch (err) {
      console.warn('Carregando documentos do armazenamento permanente local:', err);
    }

    let cached = getLocalCache<DocumentItem[]>(CACHE_KEYS.DOCUMENTS, []);
    if (params?.employeeId) cached = cached.filter((d) => d.employeeId === params.employeeId);
    if (params?.category) cached = cached.filter((d) => d.category === params.category);
    return cached;
  },
  uploadDocument: async (data: Partial<DocumentItem> & { fileData?: string }) => {
    try {
      const res = await fetchJSON<DocumentItem>('/documents', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<DocumentItem[]>(CACHE_KEYS.DOCUMENTS, []);
      setLocalCache(CACHE_KEYS.DOCUMENTS, [res, ...current.filter((d) => d.id !== res.id)]);
      return res;
    } catch (err) {
      const localDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        name: data.name || 'Documento',
        category: data.category || 'OUTRO',
        categoryName: data.categoryName || 'Outro',
        employeeId: data.employeeId || '',
        employeeName: data.employeeName || '',
        fileName: data.fileName || 'arquivo.pdf',
        fileSize: data.fileSize || 1024,
        fileType: data.fileType || 'application/pdf',
        uploadDate: new Date().toISOString(),
        uploadedBy: data.uploadedBy || 'Sistema',
        folderPath: data.folderPath || 'GERAL',
        status: data.status || 'VALIDO',
        fileUrl: data.fileData || '',
        ...data,
      } as DocumentItem;
      const current = getLocalCache<DocumentItem[]>(CACHE_KEYS.DOCUMENTS, []);
      setLocalCache(CACHE_KEYS.DOCUMENTS, [localDoc, ...current]);
      return localDoc;
    }
  },
  createDocument: async (data: Partial<DocumentItem> & { fileData?: string }) => {
    return api.uploadDocument(data);
  },
  deleteDocument: async (id: string) => {
    const current = getLocalCache<DocumentItem[]>(CACHE_KEYS.DOCUMENTS, []);
    setLocalCache(CACHE_KEYS.DOCUMENTS, current.filter((d) => d.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },
  getArchiveTree: () =>
    fetchJSON<{
      tree: any[];
      totalDocuments: number;
    }>('/documents/archive-tree'),

  // Vacations
  getVacations: async (params?: { status?: string; employeeId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    const qs = query.toString() ? `?${query.toString()}` : '';

    try {
      const res = await fetchJSON<Vacation[]>(`/vacations${qs}`);
      if (Array.isArray(res)) {
        if (!params?.status && !params?.employeeId) {
          setLocalCache(CACHE_KEYS.VACATIONS, res);
        }
        return res;
      }
    } catch (err) {
      console.warn('Carregando férias do armazenamento local:', err);
    }

    let cached = getLocalCache<Vacation[]>(CACHE_KEYS.VACATIONS, []);
    if (params?.status) cached = cached.filter((v) => v.status === params.status);
    if (params?.employeeId) cached = cached.filter((v) => v.employeeId === params.employeeId);
    return cached;
  },
  createVacation: async (data: Partial<Vacation>) => {
    try {
      const res = await fetchJSON<Vacation>('/vacations', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<Vacation[]>(CACHE_KEYS.VACATIONS, []);
      setLocalCache(CACHE_KEYS.VACATIONS, [res, ...current.filter((v) => v.id !== res.id)]);
      return res;
    } catch (err) {
      const localVac: Vacation = {
        id: `vac-${Date.now()}`,
        employeeId: data.employeeId || '',
        employeeName: data.employeeName || 'Colaborador',
        employeeCode: data.employeeCode || '',
        departmentName: data.departmentName || '',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate || new Date().toISOString().split('T')[0],
        daysCount: data.daysCount || 22,
        type: data.type || 'FERIAS_ANUAIS',
        typeName: data.typeName || 'Férias Anuais',
        status: data.status || 'PENDENTE',
        createdAt: new Date().toISOString(),
        ...data,
      } as Vacation;
      const current = getLocalCache<Vacation[]>(CACHE_KEYS.VACATIONS, []);
      setLocalCache(CACHE_KEYS.VACATIONS, [localVac, ...current]);
      return localVac;
    }
  },
  updateVacation: async (id: string, data: Partial<Vacation>) => {
    try {
      const res = await fetchJSON<Vacation>(`/vacations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const current = getLocalCache<Vacation[]>(CACHE_KEYS.VACATIONS, []);
      setLocalCache(
        CACHE_KEYS.VACATIONS,
        current.map((v) => (v.id === id ? { ...v, ...res } : v))
      );
      return res;
    } catch (err) {
      const current = getLocalCache<Vacation[]>(CACHE_KEYS.VACATIONS, []);
      const updated = current.map((v) => (v.id === id ? { ...v, ...data } : v));
      setLocalCache(CACHE_KEYS.VACATIONS, updated);
      return updated.find((v) => v.id === id) as Vacation;
    }
  },
  deleteVacation: async (id: string) => {
    const current = getLocalCache<Vacation[]>(CACHE_KEYS.VACATIONS, []);
    setLocalCache(CACHE_KEYS.VACATIONS, current.filter((v) => v.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/vacations/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },
  approveVacation: (id: string) =>
    fetchJSON<Vacation>(`/vacations/${id}/approve`, { method: 'PUT' }),
  rejectVacation: (id: string, reason?: string) =>
    fetchJSON<Vacation>(`/vacations/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),

  // Absences
  getAbsences: async (params?: { employeeId?: string; department?: string; type?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.department) query.set('department', params.department);
    if (params?.type) query.set('type', params.type);
    if (params?.date) query.set('date', params.date);
    const qs = query.toString() ? `?${query.toString()}` : '';

    try {
      const res = await fetchJSON<Absence[]>(`/absences${qs}`);
      if (Array.isArray(res)) {
        if (!params?.employeeId && !params?.department && !params?.type && !params?.date) {
          setLocalCache(CACHE_KEYS.ABSENCES, res);
        }
        return res;
      }
    } catch (err) {
      console.warn('Carregando faltas do armazenamento local:', err);
    }

    let cached = getLocalCache<Absence[]>(CACHE_KEYS.ABSENCES, []);
    if (params?.employeeId) cached = cached.filter((a) => a.employeeId === params.employeeId);
    return cached;
  },
  createAbsence: async (data: Partial<Absence>) => {
    try {
      const res = await fetchJSON<Absence>('/absences', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<Absence[]>(CACHE_KEYS.ABSENCES, []);
      setLocalCache(CACHE_KEYS.ABSENCES, [res, ...current.filter((a) => a.id !== res.id)]);
      return res;
    } catch (err) {
      const localAbs: Absence = {
        id: `abs-${Date.now()}`,
        employeeId: data.employeeId || '',
        employeeName: data.employeeName || 'Colaborador',
        employeeCode: data.employeeCode || '',
        departmentName: data.departmentName || '',
        date: data.date || new Date().toISOString().split('T')[0],
        type: data.type || 'INJUSTIFICADA',
        typeName: data.typeName || 'Falta Injustificada',
        reason: data.reason || '',
        isJustified: data.isJustified || false,
        registeredBy: data.registeredBy || 'Sistema',
        createdAt: new Date().toISOString(),
        ...data,
      } as Absence;
      const current = getLocalCache<Absence[]>(CACHE_KEYS.ABSENCES, []);
      setLocalCache(CACHE_KEYS.ABSENCES, [localAbs, ...current]);
      return localAbs;
    }
  },
  justifyAbsence: (id: string, proofNote: string) =>
    fetchJSON<Absence>(`/absences/${id}/justify`, { method: 'PUT', body: JSON.stringify({ proofNote }) }),
  deleteAbsence: async (id: string) => {
    const current = getLocalCache<Absence[]>(CACHE_KEYS.ABSENCES, []);
    setLocalCache(CACHE_KEYS.ABSENCES, current.filter((a) => a.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/absences/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },

  // Salaries & Payroll
  getSalaryHistory: (employeeId?: string) => {
    const query = employeeId ? `?employeeId=${employeeId}` : '';
    return fetchJSON<SalaryHistory[]>(`/salaries/history${query}`);
  },
  updateSalary: (employeeId: string, newSalary: number, reason?: string) =>
    fetchJSON<{ employee: Employee; history: SalaryHistory }>('/salaries/update', {
      method: 'POST',
      body: JSON.stringify({ employeeId, newSalary, reason }),
    }),
  getPayrollSheets: async () => {
    try {
      const res = await fetchJSON<PayrollSheet[]>('/payroll/sheets');
      if (Array.isArray(res)) {
        setLocalCache(CACHE_KEYS.PAYROLL, res);
        return res;
      }
    } catch (err) {
      console.warn('Carregando folhas de pagamento do armazenamento local:', err);
    }
    return getLocalCache<PayrollSheet[]>(CACHE_KEYS.PAYROLL, []);
  },
  getPayrollSheetById: (id: string) => fetchJSON<PayrollSheet>(`/payroll/sheets/${id}`),
  generatePayroll: async (data: { referenceMonth: string; mealAllowanceDefault?: number; transportAllowanceDefault?: number }) => {
    const res = await fetchJSON<PayrollSheet>('/payroll/generate', { method: 'POST', body: JSON.stringify(data) });
    const current = getLocalCache<PayrollSheet[]>(CACHE_KEYS.PAYROLL, []);
    setLocalCache(CACHE_KEYS.PAYROLL, [res, ...current.filter((p) => p.id !== res.id)]);
    return res;
  },
  createPayrollSheet: async (data: { title: string; month: string; year: number }) => {
    return api.generatePayroll({ referenceMonth: `${data.year}-${data.month}` });
  },
  updatePayrollSheet: async (id: string, data: Partial<PayrollSheet>) => {
    const res = await fetchJSON<PayrollSheet>(`/payroll/sheets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    const current = getLocalCache<PayrollSheet[]>(CACHE_KEYS.PAYROLL, []);
    setLocalCache(
      CACHE_KEYS.PAYROLL,
      current.map((p) => (p.id === id ? { ...p, ...res } : p))
    );
    return res;
  },
  deletePayrollSheet: async (id: string) => {
    const current = getLocalCache<PayrollSheet[]>(CACHE_KEYS.PAYROLL, []);
    setLocalCache(CACHE_KEYS.PAYROLL, current.filter((p) => p.id !== id));
    return fetchJSON<{ success: boolean }>(`/payroll/sheets/${id}`, { method: 'DELETE' });
  },
  lockPayroll: (id: string) => fetchJSON<PayrollSheet>(`/payroll/sheets/${id}/lock`, { method: 'PUT' }),
  unlockPayroll: (id: string) => fetchJSON<PayrollSheet>(`/payroll/sheets/${id}/unlock`, { method: 'PUT' }),

  // Settings
  getCompanySettings: async () => {
    try {
      const res = await fetchJSON<CompanySettings>('/settings/company');
      if (res && res.companyName) {
        setLocalCache(CACHE_KEYS.COMPANY, res);
        return res;
      }
    } catch (err) {
      console.warn('Carregando definições da empresa do armazenamento local:', err);
    }
    return getLocalCache<CompanySettings | null>(CACHE_KEYS.COMPANY, null as any);
  },
  updateCompanySettings: async (data: Partial<CompanySettings>) => {
    setLocalCache(CACHE_KEYS.COMPANY, data);
    try {
      const res = await fetchJSON<CompanySettings>('/settings/company', { method: 'PUT', body: JSON.stringify(data) });
      setLocalCache(CACHE_KEYS.COMPANY, res);
      return res;
    } catch (err) {
      return data as CompanySettings;
    }
  },
  getVisualSettings: async () => {
    try {
      const res = await fetchJSON<VisualSettings>('/settings/visual');
      if (res) {
        setLocalCache(CACHE_KEYS.VISUAL, res);
        return res;
      }
    } catch (err) {
      console.warn('Carregando preferências visuais do armazenamento local:', err);
    }
    return getLocalCache<VisualSettings | null>(CACHE_KEYS.VISUAL, null as any);
  },
  updateVisualSettings: async (data: Partial<VisualSettings>) => {
    setLocalCache(CACHE_KEYS.VISUAL, data);
    try {
      const res = await fetchJSON<VisualSettings>('/settings/visual', { method: 'PUT', body: JSON.stringify(data) });
      setLocalCache(CACHE_KEYS.VISUAL, res);
      return res;
    } catch (err) {
      return data as VisualSettings;
    }
  },
  getDepartments: async () => {
    try {
      const res = await fetchJSON<Department[]>('/settings/departments');
      if (Array.isArray(res) && res.length > 0) {
        setLocalCache(CACHE_KEYS.DEPARTMENTS, res);
        return res;
      }
    } catch (err) {
      console.warn('Carregando departamentos do armazenamento local:', err);
    }
    return getLocalCache<Department[]>(CACHE_KEYS.DEPARTMENTS, []);
  },
  createDepartment: async (data: Partial<Department>) => {
    try {
      const res = await fetchJSON<Department>('/settings/departments', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<Department[]>(CACHE_KEYS.DEPARTMENTS, []);
      setLocalCache(CACHE_KEYS.DEPARTMENTS, [...current, res]);
      return res;
    } catch (err) {
      const localDept: Department = {
        id: `dep-${Date.now()}`,
        code: data.code || 'DEP',
        name: data.name || 'Departamento',
        managerName: data.managerName,
        description: data.description,
      };
      const current = getLocalCache<Department[]>(CACHE_KEYS.DEPARTMENTS, []);
      setLocalCache(CACHE_KEYS.DEPARTMENTS, [...current, localDept]);
      return localDept;
    }
  },
  deleteDepartment: async (id: string) => {
    const current = getLocalCache<Department[]>(CACHE_KEYS.DEPARTMENTS, []);
    setLocalCache(CACHE_KEYS.DEPARTMENTS, current.filter((d) => d.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/settings/departments/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },
  getPositions: async () => {
    try {
      const res = await fetchJSON<Position[]>('/settings/positions');
      if (Array.isArray(res) && res.length > 0) {
        setLocalCache(CACHE_KEYS.POSITIONS, res);
        return res;
      }
    } catch (err) {
      console.warn('Carregando cargos do armazenamento local:', err);
    }
    return getLocalCache<Position[]>(CACHE_KEYS.POSITIONS, []);
  },
  createPosition: async (data: Partial<Position>) => {
    try {
      const res = await fetchJSON<Position>('/settings/positions', { method: 'POST', body: JSON.stringify(data) });
      const current = getLocalCache<Position[]>(CACHE_KEYS.POSITIONS, []);
      setLocalCache(CACHE_KEYS.POSITIONS, [...current, res]);
      return res;
    } catch (err) {
      const localPos: Position = {
        id: `pos-${Date.now()}`,
        title: data.title || 'Cargo',
        departmentId: data.departmentId || '',
        baseSalary: Number(data.baseSalary) || 400000,
      };
      const current = getLocalCache<Position[]>(CACHE_KEYS.POSITIONS, []);
      setLocalCache(CACHE_KEYS.POSITIONS, [...current, localPos]);
      return localPos;
    }
  },
  deletePosition: async (id: string) => {
    const current = getLocalCache<Position[]>(CACHE_KEYS.POSITIONS, []);
    setLocalCache(CACHE_KEYS.POSITIONS, current.filter((p) => p.id !== id));
    try {
      return await fetchJSON<{ success: boolean }>(`/settings/positions/${id}`, { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },
  getDocumentCategories: async () => [
    { id: 'BI', name: 'Bilhete de Identidade (BI)', description: 'Documento nacional de identificação', requiresExpiry: true },
    { id: 'PASSAPORTE', name: 'Passaporte', description: 'Passaporte nacional ou internacional', requiresExpiry: true },
    { id: 'NIF', name: 'Cartão de Contribuinte (NIF)', description: 'Número de Identificação Fiscal', requiresExpiry: false },
    { id: 'CV', name: 'Curriculum Vitae (CV)', description: 'Histórico profissional e formativo', requiresExpiry: false },
    { id: 'ATESTADO_MEDICO', name: 'Atestado Médico / Aptidão', description: 'Certificado de robustez física e sanidade', requiresExpiry: true },
    { id: 'CONTRATO_ASSINADO', name: 'Contrato de Trabalho Assinado', description: 'Via assinada e rubricada pelas partes', requiresExpiry: false },
    { id: 'CERTIFICADO', name: 'Certificado de Habilitações', description: 'Diplomas e certificados escolares/universitários', requiresExpiry: false },
    { id: 'DOCUMENTO_BANCARIO', name: 'Comprovativo Bancário (IBAN)', description: 'Declaração com dados de conta bancária', requiresExpiry: false },
  ],

  // Notifications & Audit Logs
  getNotifications: () => fetchJSON<NotificationItem[]>('/notifications'),
  markNotificationRead: (id: string) =>
    fetchJSON<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    fetchJSON<{ success: boolean }>('/notifications/mark-all-read', { method: 'PUT' }),
  getAuditLogs: (params?: { module?: string; action?: string }) => {
    const query = new URLSearchParams();
    if (params?.module) query.set('module', params.module);
    if (params?.action) query.set('action', params.action);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJSON<AuditLog[]>(`/audit-logs${qs}`);
  },

  // Backup & Restore
  exportBackupUrl: () => `${BASE_URL}/backup/export`,
  restoreBackup: (backupData: any) =>
    fetchJSON<{ success: boolean }>('/backup/restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    }),

  // Local Server & Network
  getLocalServerInfo: () =>
    fetchJSON<{
      port: number;
      hostname: string;
      platform: string;
      localIpAddresses: string[];
      databaseFile: string;
      databaseSizeBytes: number;
      databaseLastModified: string;
      counts: {
        employees: number;
        contracts: number;
        documents: number;
        payrollSheets: number;
        users: number;
        auditLogs: number;
      };
    }>('/system/local-server-info'),

  // Search
  globalSearch: (query: string) =>
    fetchJSON<{
      employees: Employee[];
      contracts: Contract[];
      documents: DocumentItem[];
      departments: Department[];
    }>(`/search?q=${encodeURIComponent(query)}`),
};
