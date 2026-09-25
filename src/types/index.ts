export type NavigationModule = 
  | 'dashboard'
  | 'employees'
  | 'contracts'
  | 'documents'
  | 'vacations'
  | 'absences'
  | 'salaries'
  | 'payroll'
  | 'reports'
  | 'audit'
  | 'settings';

export type RoleType = 'ADMINISTRADOR' | 'RH' | 'CONTABILIDADE' | 'GESTOR' | 'UTILIZADOR' | 'CONSULTA';
export type UserRole = RoleType | 'RECURSOS_HUMANOS';
export type PermissionSet = Record<string, boolean>;

export interface User {
  id: string;
  code?: string;
  name: string;
  email: string;
  role: RoleType;
  password?: string;
  avatar?: string;
  departmentId?: string;
  employeeId?: string;
  employeeCode?: string;
  biNumber?: string;
  isEmployeeOnly?: boolean;
  active: boolean;
  createdAt: string;
}

export interface Permission {
  module: 'employees' | 'contracts' | 'documents' | 'vacations' | 'absences' | 'salaries' | 'reports' | 'settings';
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'print')[];
}

export interface RolePermissions {
  role: RoleType;
  description: string;
  permissions: {
    employees: ('view' | 'create' | 'edit' | 'delete')[];
    contracts: ('view' | 'create' | 'edit' | 'delete' | 'approve' | 'print')[];
    documents: ('view' | 'upload' | 'download' | 'delete')[];
    vacations: ('view' | 'create' | 'edit' | 'approve' | 'delete')[];
    absences: ('view' | 'create' | 'edit' | 'delete')[];
    salaries: ('view' | 'create' | 'edit' | 'export' | 'delete')[];
    reports: ('view' | 'export' | 'print')[];
    settings: ('view' | 'edit')[];
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  managerName?: string;
  description?: string;
}

export interface Position {
  id: string;
  title: string;
  departmentId: string;
  departmentName?: string;
  baseSalary?: number;
  baseSalaryMin?: number;
  baseSalaryMax?: number;
}

export type EmployeeStatus = 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'EM_FERIAS' | 'DESLIGADO';

export interface Employee {
  id: string;
  code: string; // Ex: EMP-001
  // Dados Pessoais
  fullName: string;
  nickname?: string;
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  birthDate: string;
  nationality: string;
  maritalStatus: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_DE_FACTO';
  idNumber: string; // BI / Passaporte
  idIssueDate?: string;
  idExpiryDate?: string;
  nif: string;
  phone: string;
  email: string;
  address: string;
  municipality: string;
  province: string;
  photoUrl?: string;

  // Dados Profissionais
  positionId: string;
  positionName: string;
  departmentId: string;
  departmentName: string;
  jobRole: string; // Função
  admissionDate: string;
  contractType: string;
  contractStartDate: string;
  contractEndDate?: string;
  status: EmployeeStatus;
  baseSalary: number;
  bankName: string;
  accountNumber: string;
  iban: string;
  socialSecurityNumber?: string;

  // Emergência
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  emergencyContactAddress?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractStatus = 'ATIVO' | 'A_TERMINAR' | 'TERMINADO' | 'CANCELADO';
export type ContractType = 
  | 'TEMPO_INDETERMINADO'
  | 'TERMO_CERTO'
  | 'TERMO_INCERTO'
  | 'PRESTACAO_SERVICOS'
  | 'ESTAGIO'
  | 'OUTRO';

export interface Contract {
  id: string;
  contractNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  positionName: string;
  type: ContractType;
  typeName: string;
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  baseSalary: number;
  status: ContractStatus;
  notes?: string;
  signedDate?: string;
  signedDocumentUrl?: string;
  isSigned: boolean;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTemplate {
  id: string;
  title: string;
  description: string;
  content: string; // with {{NOME_FUNCIONARIO}}, etc.
  type: ContractType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'VALIDO' | 'EXPIRADO' | 'PENDENTE' | 'EM_ANALISE';
export type DocumentCategory = 
  | 'BI'
  | 'PASSAPORTE'
  | 'NIF'
  | 'CERTIFICADO'
  | 'CV'
  | 'ATESTADO_MEDICO'
  | 'CONTRATO'
  | 'CONTRATO_ASSINADO'
  | 'DECLARACAO'
  | 'CERTIFICADO_PROFISSIONAL'
  | 'FOTOGRAFIA'
  | 'DOCUMENTO_BANCARIO'
  | 'OUTRO';

export interface DocumentCategoryMeta {
  id: string;
  name: string;
  description: string;
  requiresExpiry: boolean;
}

export interface DocumentItem {
  id: string;
  name: string;
  fileName: string;
  fileSize: number | string;
  fileType: string;
  category: DocumentCategory;
  categoryId?: string;
  categoryName: string;
  employeeId?: string;
  employeeName?: string;
  issueDate?: string;
  expiryDate?: string;
  uploadDate: string;
  uploadedBy: string;
  notes?: string;
  status: DocumentStatus;
  fileUrl: string;
  folderPath: string; // Ex: EMPRESA/FUNCIONÁRIOS/EMP-001
}

export type VacationStatus = 
  | 'PENDENTE' 
  | 'APROVADA' 
  | 'REJEITADA' 
  | 'CANCELADA' 
  | 'EM_CURSO' 
  | 'CONCLUIDA'
  | 'APROVADO'
  | 'EM_GOZO';

export interface Vacation {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  type: 'FERIAS_ANUAIS' | 'FERIAS_JUDICIAIS' | 'LICENCA_PARENTAL' | 'OUTRO';
  typeName: string;
  status: VacationStatus;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export type AbsenceType = 
  | 'JUSTIFICADA' 
  | 'INJUSTIFICADA' 
  | 'ATRASO' 
  | 'SAIDA_ANTECIPADA' 
  | 'AUSENCIA_AUTORIZADA';

export interface Absence {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  date: string;
  time?: string;
  hours?: number;
  type: AbsenceType;
  typeName: string;
  reason: string;
  isJustified: boolean;
  deductFromSalary?: boolean;
  documentProofName?: string;
  documentProofUrl?: string;
  notes?: string;
  registeredBy: string;
  createdAt: string;
}

export interface SalaryComponent {
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  bonus: number;
  deductions: number;
  absenceDeductions: number;
  netSalary: number;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  departmentName: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  bonus: number;
  deductions: number;
  absencesCount: number;
  absenceDeductions: number;
  netSalary: number;
  paymentDate?: string;
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO';
  notes?: string;
}

export interface PayrollItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  baseSalary: number;
  transportAllowance: number;
  foodAllowance: number;
  bonus: number;
  overtime: number;
  grossSalary: number;
  inss: number;
  irt: number;
  absenceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  socialSecurityNumber?: string;
}

export interface PayrollSheet {
  id: string;
  referenceMonth: string; // Ex: 2026-09
  title: string;
  totalEmployees: number;
  totalGross: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalNet: number;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  month?: string;
  year?: number;
  status?: 'RASCUNHO' | 'APROVADA' | 'PAGA';
  items?: PayrollItem[];
  employeeCount?: number;
  approvedBy?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
  entries?: PayrollEntry[];
}

export interface SalaryHistory {
  id: string;
  employeeId: string;
  employeeName: string;
  previousSalary: number;
  newSalary: number;
  changeDate: string;
  reason: string;
  changedBy: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  category: 'CONTRATO' | 'DOCUMENTO' | 'FERIAS' | 'FALTA' | 'FOLHA_SALARIAL';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  module?: string;
  recordId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface CompanySettings {
  companyName: string;
  commercialName: string;
  tradingName?: string;
  nif: string;
  commercialRegistryNumber?: string;
  address: string;
  municipality: string;
  province: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  phone1?: string;
  phone2?: string;
  email: string;
  website: string;
  logoUrl?: string;
  responsibleName?: string;
  responsiblePosition?: string;
  legalRepresentative?: string;
  legalRepresentativeRole?: string;
  bankName?: string;
  iban?: string;
}

export interface VisualSettings {
  primaryColor: string;
  secondaryColor?: string;
  darkMode?: boolean;
  sidebarTheme?: string;
  dateFormat?: string;
  contractExpiryNoticeDays?: number;
  documentExpiryNoticeDays?: number;
  alertNoticeDays?: number;
  documentAlertNoticeDays?: number;
  currencySymbol: string;
  currency?: string;
  systemTitle?: string;
  systemSubtitle?: string;
  compactView?: boolean;
}

export interface ArchiveFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  itemsCount: number;
}
