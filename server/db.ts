import fs from 'fs';
import path from 'path';
import {
  User,
  Department,
  Position,
  Employee,
  Contract,
  ContractTemplate,
  DocumentItem,
  Vacation,
  Absence,
  PayrollSheet,
  SalaryHistory,
  NotificationItem,
  AuditLog,
  CompanySettings,
  VisualSettings,
  RolePermissions,
} from '../src/types/index.ts';
import {
  initialCompanySettings,
  initialVisualSettings,
  initialRoles,
  initialUsers,
  initialDepartments,
  initialPositions,
  initialEmployees,
  initialContracts,
  initialContractTemplates,
  initialDocuments,
  initialVacations,
  initialAbsences,
  initialSalaryHistory,
  initialPayrollSheets,
  initialNotifications,
  initialAuditLogs,
} from './initialData.ts';

interface DatabaseSchema {
  companySettings: CompanySettings;
  visualSettings: VisualSettings;
  roles: RolePermissions[];
  users: User[];
  departments: Department[];
  positions: Position[];
  employees: Employee[];
  contracts: Contract[];
  contractTemplates: ContractTemplate[];
  documents: DocumentItem[];
  vacations: Vacation[];
  absences: Absence[];
  salaryHistory: SalaryHistory[];
  payrollSheets: PayrollSheet[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

class EnterpriseDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectories();
    this.data = this.loadDatabase();
    if (!this.data.companySettings.logoUrl) {
      this.data.companySettings.logoUrl = '/company_logo.jpg';
    }
  }

  private ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        return {
          companySettings: parsed.companySettings || initialCompanySettings,
          visualSettings: parsed.visualSettings || initialVisualSettings,
          roles: parsed.roles || initialRoles,
          users: parsed.users || initialUsers,
          departments: parsed.departments || initialDepartments,
          positions: parsed.positions || initialPositions,
          employees: parsed.employees || initialEmployees,
          contracts: parsed.contracts || initialContracts,
          contractTemplates: parsed.contractTemplates || initialContractTemplates,
          documents: parsed.documents || initialDocuments,
          vacations: parsed.vacations || initialVacations,
          absences: parsed.absences || initialAbsences,
          salaryHistory: parsed.salaryHistory || initialSalaryHistory,
          payrollSheets: parsed.payrollSheets || initialPayrollSheets,
          notifications: parsed.notifications || initialNotifications,
          auditLogs: parsed.auditLogs || initialAuditLogs,
        };
      } catch (err) {
        console.error('Error loading database file, initializing with defaults', err);
      }
    }

    const defaultData: DatabaseSchema = {
      companySettings: initialCompanySettings,
      visualSettings: initialVisualSettings,
      roles: initialRoles,
      users: initialUsers,
      departments: initialDepartments,
      positions: initialPositions,
      employees: initialEmployees,
      contracts: initialContracts,
      contractTemplates: initialContractTemplates,
      documents: initialDocuments,
      vacations: initialVacations,
      absences: initialAbsences,
      salaryHistory: initialSalaryHistory,
      payrollSheets: initialPayrollSheets,
      notifications: initialNotifications,
      auditLogs: initialAuditLogs,
    };
    this.persist(defaultData);
    return defaultData;
  }

  private persist(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDirectories();
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file', err);
    }
  }

  public save() {
    this.persist();
  }

  public logAudit(entry: {
    userId: string;
    userName: string;
    userRole: string;
    action: string;
    entity: string;
    entityId?: string;
    details: string;
    ipAddress?: string;
  }) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep last 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
    return log;
  }

  public addNotification(notif: {
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
    category: 'CONTRATO' | 'DOCUMENTO' | 'FERIAS' | 'FALTA' | 'FOLHA_SALARIAL';
    link?: string;
  }) {
    const item: NotificationItem = {
      id: `notif-${Date.now()}`,
      ...notif,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(item);
    this.save();
    return item;
  }

  // Getters
  public getCompanySettings() { return this.data.companySettings; }
  public updateCompanySettings(settings: Partial<CompanySettings>) {
    this.data.companySettings = { ...this.data.companySettings, ...settings };
    this.save();
    return this.data.companySettings;
  }

  public getVisualSettings() { return this.data.visualSettings; }
  public updateVisualSettings(settings: Partial<VisualSettings>) {
    this.data.visualSettings = { ...this.data.visualSettings, ...settings };
    this.save();
    return this.data.visualSettings;
  }

  public getRoles() { return this.data.roles; }
  public updateRole(role: RolePermissions) {
    const idx = this.data.roles.findIndex((r) => r.role === role.role);
    if (idx !== -1) {
      this.data.roles[idx] = role;
    } else {
      this.data.roles.push(role);
    }
    this.save();
    return role;
  }

  public getUsers() { return this.data.users; }
  public getUserById(id: string) { return this.data.users.find((u) => u.id === id); }
  public getUserByEmail(email: string) { return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()); }
  public saveUser(user: User) {
    const idx = this.data.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      this.data.users[idx] = user;
    } else {
      this.data.users.push(user);
    }
    this.save();
    return user;
  }
  public deleteUser(id: string) {
    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.save();
  }

  public getDepartments() { return this.data.departments; }
  public saveDepartment(dep: Department) {
    const idx = this.data.departments.findIndex((d) => d.id === dep.id);
    if (idx !== -1) {
      this.data.departments[idx] = dep;
    } else {
      this.data.departments.push(dep);
    }
    this.save();
    return dep;
  }
  public deleteDepartment(id: string) {
    this.data.departments = this.data.departments.filter((d) => d.id !== id);
    this.save();
  }

  public getPositions() { return this.data.positions; }
  public savePosition(pos: Position) {
    const idx = this.data.positions.findIndex((p) => p.id === pos.id);
    if (idx !== -1) {
      this.data.positions[idx] = pos;
    } else {
      this.data.positions.push(pos);
    }
    this.save();
    return pos;
  }
  public deletePosition(id: string) {
    this.data.positions = this.data.positions.filter((p) => p.id !== id);
    this.save();
  }

  public getEmployees() { return this.data.employees; }
  public getEmployeeById(id: string) { return this.data.employees.find((e) => e.id === id); }
  public saveEmployee(emp: Employee) {
    const idx = this.data.employees.findIndex((e) => e.id === emp.id);
    if (idx !== -1) {
      this.data.employees[idx] = emp;
    } else {
      this.data.employees.unshift(emp);
    }
    this.save();
    return emp;
  }
  public deleteEmployee(id: string) {
    this.data.employees = this.data.employees.filter((e) => e.id !== id);
    this.save();
  }

  public getContracts() { return this.data.contracts; }
  public getContractById(id: string) { return this.data.contracts.find((c) => c.id === id); }
  public saveContract(contract: Contract) {
    const idx = this.data.contracts.findIndex((c) => c.id === contract.id);
    if (idx !== -1) {
      this.data.contracts[idx] = contract;
    } else {
      this.data.contracts.unshift(contract);
    }
    this.save();
    return contract;
  }
  public deleteContract(id: string) {
    this.data.contracts = this.data.contracts.filter((c) => c.id !== id);
    this.save();
  }

  public getContractTemplates() { return this.data.contractTemplates; }
  public saveContractTemplate(template: ContractTemplate) {
    const idx = this.data.contractTemplates.findIndex((t) => t.id === template.id);
    if (idx !== -1) {
      this.data.contractTemplates[idx] = template;
    } else {
      this.data.contractTemplates.push(template);
    }
    this.save();
    return template;
  }
  public deleteContractTemplate(id: string) {
    this.data.contractTemplates = this.data.contractTemplates.filter((t) => t.id !== id);
    this.save();
  }

  public getDocuments() { return this.data.documents; }
  public getDocumentById(id: string) { return this.data.documents.find((d) => d.id === id); }
  public saveDocument(doc: DocumentItem) {
    const idx = this.data.documents.findIndex((d) => d.id === doc.id);
    if (idx !== -1) {
      this.data.documents[idx] = doc;
    } else {
      this.data.documents.unshift(doc);
    }
    this.save();
    return doc;
  }
  public deleteDocument(id: string) {
    this.data.documents = this.data.documents.filter((d) => d.id !== id);
    this.save();
  }

  public getVacations() { return this.data.vacations; }
  public getVacationById(id: string) { return this.data.vacations.find((v) => v.id === id); }
  public saveVacation(vac: Vacation) {
    const idx = this.data.vacations.findIndex((v) => v.id === vac.id);
    if (idx !== -1) {
      this.data.vacations[idx] = vac;
    } else {
      this.data.vacations.unshift(vac);
    }
    this.save();
    return vac;
  }
  public deleteVacation(id: string) {
    this.data.vacations = this.data.vacations.filter((v) => v.id !== id);
    this.save();
  }

  public getAbsences() { return this.data.absences; }
  public getAbsenceById(id: string) { return this.data.absences.find((a) => a.id === id); }
  public saveAbsence(abs: Absence) {
    const idx = this.data.absences.findIndex((a) => a.id === abs.id);
    if (idx !== -1) {
      this.data.absences[idx] = abs;
    } else {
      this.data.absences.unshift(abs);
    }
    this.save();
    return abs;
  }
  public deleteAbsence(id: string) {
    this.data.absences = this.data.absences.filter((a) => a.id !== id);
    this.save();
  }

  public getSalaryHistory(employeeId?: string) {
    if (employeeId) {
      return this.data.salaryHistory.filter((sh) => sh.employeeId === employeeId);
    }
    return this.data.salaryHistory;
  }
  public addSalaryHistory(sh: SalaryHistory) {
    this.data.salaryHistory.unshift(sh);
    this.save();
    return sh;
  }

  private normalizeSheet(sheet: PayrollSheet): PayrollSheet {
    if (!sheet) return sheet;
    const [yearStr, monthStr] = (sheet.referenceMonth || '2026-09').split('-');
    sheet.month = sheet.month || monthStr;
    sheet.year = sheet.year || Number(yearStr);
    sheet.status = sheet.status || (sheet.isLocked ? 'PAGA' : 'APROVADA');

    if (!sheet.items || sheet.items.length === 0) {
      if (sheet.entries && sheet.entries.length > 0) {
        sheet.items = sheet.entries.map((entry) => {
          const inss = Math.round(entry.baseSalary * 0.03);
          let irt = 0;
          if (entry.baseSalary > 1000000) irt = Math.round(entry.baseSalary * 0.17);
          else if (entry.baseSalary > 500000) irt = Math.round(entry.baseSalary * 0.14);
          else if (entry.baseSalary > 200000) irt = Math.round(entry.baseSalary * 0.10);
          else if (entry.baseSalary > 100000) irt = Math.round(entry.baseSalary * 0.05);

          const grossSalary =
            entry.baseSalary +
            (entry.mealAllowance || 0) +
            (entry.transportAllowance || 0) +
            (entry.bonus || 0);
          const totalDeductions = inss + irt + (entry.absenceDeductions || 0);
          const netSalary = Math.max(0, grossSalary - totalDeductions);

          return {
            id: entry.id,
            employeeId: entry.employeeId,
            employeeCode: entry.employeeCode,
            employeeName: entry.employeeName,
            departmentName: entry.departmentName,
            positionName: entry.positionName,
            baseSalary: entry.baseSalary,
            transportAllowance: entry.transportAllowance || 0,
            foodAllowance: entry.mealAllowance || 0,
            bonus: entry.bonus || 0,
            overtime: 0,
            grossSalary,
            inss,
            irt,
            absenceDeduction: entry.absenceDeductions || 0,
            otherDeductions: 0,
            totalDeductions,
            netSalary,
            bankName: entry.bankName,
            accountNumber: entry.accountNumber,
            iban: entry.iban,
          };
        });
      } else {
        sheet.items = [];
      }
    }
    return sheet;
  }

  public getPayrollSheets() {
    return this.data.payrollSheets.map((s) => this.normalizeSheet(s));
  }
  public getPayrollSheetById(id: string) {
    const sheet = this.data.payrollSheets.find((p) => p.id === id);
    return sheet ? this.normalizeSheet(sheet) : undefined;
  }
  public savePayrollSheet(sheet: PayrollSheet) {
    const normalized = this.normalizeSheet(sheet);
    const idx = this.data.payrollSheets.findIndex((p) => p.id === normalized.id);
    if (idx !== -1) {
      this.data.payrollSheets[idx] = normalized;
    } else {
      this.data.payrollSheets.unshift(normalized);
    }
    this.save();
    return normalized;
  }
  public deletePayrollSheet(id: string) {
    this.data.payrollSheets = this.data.payrollSheets.filter((p) => p.id !== id);
    this.save();
  }

  public getNotifications() { return this.data.notifications; }
  public markNotificationAsRead(id: string) {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }
  public markAllNotificationsAsRead() {
    this.data.notifications.forEach((n) => (n.read = true));
    this.save();
  }

  public getAuditLogs() { return this.data.auditLogs; }

  public exportBackup() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: this.data,
    };
  }

  public restoreBackup(backupData: any) {
    if (!backupData || !backupData.data) {
      throw new Error('Formato de ficheiro de cópia de segurança inválido.');
    }
    this.data = backupData.data;
    this.save();
    return true;
  }
}

export const db = new EnterpriseDatabase();
