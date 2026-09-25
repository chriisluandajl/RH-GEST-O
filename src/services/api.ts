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
  login: (email: string, password?: string) =>
    fetchJSON<{ token: string; user: User; employee?: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  employeeLogin: (identifier: string) =>
    fetchJSON<{ token: string; user: User; employee?: any }>('/auth/employee-login', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),
  getMe: () => fetchJSON<{ user: User }>('/auth/me'),
  getUsers: () => fetchJSON<User[]>('/auth/users'),
  createUser: (data: Partial<User> & { password?: string }) =>
    fetchJSON<User>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User>) =>
    fetchJSON<User>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    fetchJSON<{ success: boolean }>(`/auth/users/${id}`, { method: 'DELETE' }),
  getRoles: () => fetchJSON<RolePermissions[]>('/auth/roles'),
  updateRole: (role: string, data: Partial<RolePermissions>) =>
    fetchJSON<RolePermissions>(`/auth/roles/${role}`, { method: 'PUT', body: JSON.stringify(data) }),

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
  getEmployees: (params?: { department?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.department) query.set('department', params.department);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return fetchJSON<Employee[]>(`/employees?${query.toString()}`);
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
  createEmployee: (data: Partial<Employee>) =>
    fetchJSON<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<Employee>) =>
    fetchJSON<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    fetchJSON<{ success: boolean }>(`/employees/${id}`, { method: 'DELETE' }),

  // Contracts
  getContracts: (params?: { status?: string; employeeId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.search) query.set('search', params.search);
    return fetchJSON<Contract[]>(`/contracts?${query.toString()}`);
  },
  getContractById: (id: string) => fetchJSON<Contract>(`/contracts/${id}`),
  createContract: (data: Partial<Contract>) =>
    fetchJSON<Contract>('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id: string, data: Partial<Contract>) =>
    fetchJSON<Contract>(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContract: (id: string) =>
    fetchJSON<{ success: boolean }>(`/contracts/${id}`, { method: 'DELETE' }),
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
  getDocuments: (params?: { employeeId?: string; category?: string; status?: string; folder?: string }) => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.folder) query.set('folder', params.folder);
    return fetchJSON<DocumentItem[]>(`/documents?${query.toString()}`);
  },
  uploadDocument: (data: Partial<DocumentItem> & { fileData?: string }) =>
    fetchJSON<DocumentItem>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  createDocument: (data: Partial<DocumentItem> & { fileData?: string }) =>
    fetchJSON<DocumentItem>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id: string) =>
    fetchJSON<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
  getArchiveTree: () =>
    fetchJSON<{
      tree: any[];
      totalDocuments: number;
    }>('/documents/archive-tree'),

  // Vacations
  getVacations: (params?: { status?: string; employeeId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    return fetchJSON<Vacation[]>(`/vacations?${query.toString()}`);
  },
  createVacation: (data: Partial<Vacation>) =>
    fetchJSON<Vacation>('/vacations', { method: 'POST', body: JSON.stringify(data) }),
  updateVacation: (id: string, data: Partial<Vacation>) =>
    fetchJSON<Vacation>(`/vacations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVacation: (id: string) =>
    fetchJSON<{ success: boolean }>(`/vacations/${id}`, { method: 'DELETE' }),
  approveVacation: (id: string) =>
    fetchJSON<Vacation>(`/vacations/${id}/approve`, { method: 'PUT' }),
  rejectVacation: (id: string, reason?: string) =>
    fetchJSON<Vacation>(`/vacations/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),

  // Absences
  getAbsences: (params?: { employeeId?: string; department?: string; type?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.department) query.set('department', params.department);
    if (params?.type) query.set('type', params.type);
    if (params?.date) query.set('date', params.date);
    return fetchJSON<Absence[]>(`/absences?${query.toString()}`);
  },
  createAbsence: (data: Partial<Absence>) =>
    fetchJSON<Absence>('/absences', { method: 'POST', body: JSON.stringify(data) }),
  justifyAbsence: (id: string, proofNote: string) =>
    fetchJSON<Absence>(`/absences/${id}/justify`, { method: 'PUT', body: JSON.stringify({ proofNote }) }),
  deleteAbsence: (id: string) =>
    fetchJSON<{ success: boolean }>(`/absences/${id}`, { method: 'DELETE' }),

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
  getPayrollSheets: () => fetchJSON<PayrollSheet[]>('/payroll/sheets'),
  getPayrollSheetById: (id: string) => fetchJSON<PayrollSheet>(`/payroll/sheets/${id}`),
  generatePayroll: (data: { referenceMonth: string; mealAllowanceDefault?: number; transportAllowanceDefault?: number }) =>
    fetchJSON<PayrollSheet>('/payroll/generate', { method: 'POST', body: JSON.stringify(data) }),
  createPayrollSheet: (data: { title: string; month: string; year: number }) =>
    fetchJSON<PayrollSheet>('/payroll/generate', {
      method: 'POST',
      body: JSON.stringify({ referenceMonth: `${data.year}-${data.month}`, title: data.title }),
    }),
  updatePayrollSheet: (id: string, data: Partial<PayrollSheet>) =>
    fetchJSON<PayrollSheet>(`/payroll/sheets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayrollSheet: (id: string) =>
    fetchJSON<{ success: boolean }>(`/payroll/sheets/${id}`, { method: 'DELETE' }),
  lockPayroll: (id: string) => fetchJSON<PayrollSheet>(`/payroll/sheets/${id}/lock`, { method: 'PUT' }),
  unlockPayroll: (id: string) => fetchJSON<PayrollSheet>(`/payroll/sheets/${id}/unlock`, { method: 'PUT' }),

  // Settings
  getCompanySettings: () => fetchJSON<CompanySettings>('/settings/company'),
  updateCompanySettings: (data: Partial<CompanySettings>) =>
    fetchJSON<CompanySettings>('/settings/company', { method: 'PUT', body: JSON.stringify(data) }),
  getVisualSettings: () => fetchJSON<VisualSettings>('/settings/visual'),
  updateVisualSettings: (data: Partial<VisualSettings>) =>
    fetchJSON<VisualSettings>('/settings/visual', { method: 'PUT', body: JSON.stringify(data) }),
  getDepartments: () => fetchJSON<Department[]>('/settings/departments'),
  createDepartment: (data: Partial<Department>) =>
    fetchJSON<Department>('/settings/departments', { method: 'POST', body: JSON.stringify(data) }),
  deleteDepartment: (id: string) =>
    fetchJSON<{ success: boolean }>(`/settings/departments/${id}`, { method: 'DELETE' }),
  getPositions: () => fetchJSON<Position[]>('/settings/positions'),
  createPosition: (data: Partial<Position>) =>
    fetchJSON<Position>('/settings/positions', { method: 'POST', body: JSON.stringify(data) }),
  deletePosition: (id: string) =>
    fetchJSON<{ success: boolean }>(`/settings/positions/${id}`, { method: 'DELETE' }),
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

  // Search
  globalSearch: (query: string) =>
    fetchJSON<{
      employees: Employee[];
      contracts: Contract[];
      documents: DocumentItem[];
      departments: Department[];
    }>(`/search?q=${encodeURIComponent(query)}`),
};
