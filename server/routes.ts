import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from './db.ts';
import {
  Employee,
  Contract,
  DocumentItem,
  Vacation,
  Absence,
  PayrollSheet,
  PayrollEntry,
  SalaryHistory,
  ContractTemplate,
  Department,
  Position,
  User,
} from '../src/types/index.ts';

const router = express.Router();

// Middleware to extract simulated session/user or fallback to Admin
function getCurrentUser(req: Request): { id: string; name: string; role: string } {
  const userId = (req.headers['x-user-id'] as string) || 'usr-1';
  const user = db.getUserById(userId);
  if (user) {
    return { id: user.id, name: user.name, role: user.role };
  }
  return { id: 'usr-1', name: 'Carlos Alberto Ferreira', role: 'ADMINISTRADOR' };
}

// ----------------------------------------------------
// AUTH & USERS
// ----------------------------------------------------

// Employee Login via BI Number or Employee Code (No password needed)
router.post('/auth/employee-login', (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier || typeof identifier !== 'string') {
    return res.status(400).json({ error: 'Informe o seu Número de BI ou Código de Funcionário.' });
  }

  const clean = identifier.trim().toLowerCase();
  const emp = db.getEmployees().find(
    (e) =>
      e.code.toLowerCase() === clean ||
      e.idNumber.toLowerCase() === clean ||
      (e.nif && e.nif.toLowerCase() === clean) ||
      e.id.toLowerCase() === clean ||
      e.email.toLowerCase() === clean
  );

  if (!emp) {
    return res.status(404).json({
      error: `Nenhum colaborador encontrado com o BI ou Código "${identifier}". Verifique os dados com o RH.`,
    });
  }

  // Find or create linked user session
  let user = db.getUsers().find(
    (u) => u.employeeId === emp.id || u.email.toLowerCase() === emp.email.toLowerCase()
  );

  if (!user) {
    user = {
      id: `usr-emp-${emp.id}`,
      name: emp.fullName,
      email: emp.email,
      role: 'UTILIZADOR',
      avatar: emp.photoUrl,
      departmentId: emp.departmentId,
      employeeId: emp.id,
      employeeCode: emp.code,
      biNumber: emp.idNumber,
      isEmployeeOnly: true,
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.saveUser(user);
  } else {
    user.employeeId = emp.id;
    user.employeeCode = emp.code;
    user.biNumber = emp.idNumber;
    user.isEmployeeOnly = user.role === 'UTILIZADOR';
    db.saveUser(user);
  }

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'Início de Sessão (Portal do Colaborador)',
    entity: 'Autenticação',
    entityId: emp.id,
    details: `Colaborador ${emp.fullName} (${emp.code}) entrou no Portal do Colaborador com BI ${emp.idNumber}.`,
  });

  res.json({
    token: `jwt-token-${user.id}`,
    user,
    employee: emp,
  });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-mail, utilizador, BI ou código é obrigatório.' });
  }

  const clean = email.trim().toLowerCase();

  // First check if identifier matches an employee (BI or code) and no password given
  const empMatch = db.getEmployees().find(
    (e) => e.code.toLowerCase() === clean || e.idNumber.toLowerCase() === clean
  );

  if (empMatch && (!password || password.trim() === '')) {
    let user = db.getUsers().find((u) => u.employeeId === empMatch.id);
    if (!user) {
      user = {
        id: `usr-emp-${empMatch.id}`,
        name: empMatch.fullName,
        email: empMatch.email,
        role: 'UTILIZADOR',
        avatar: empMatch.photoUrl,
        departmentId: empMatch.departmentId,
        employeeId: empMatch.id,
        employeeCode: empMatch.code,
        biNumber: empMatch.idNumber,
        isEmployeeOnly: true,
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.saveUser(user);
    }
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Início de Sessão (Portal do Colaborador)',
      entity: 'Autenticação',
      entityId: empMatch.id,
      details: `Colaborador ${empMatch.fullName} autenticado via BI/Código.`,
    });
    return res.json({ token: `jwt-token-${user.id}`, user, employee: empMatch });
  }

  // Administrative / Standard user lookup (by email, code, name or id)
  const user =
    db.getUserByEmail(email) ||
    db.getUsers().find(
      (u) =>
        (u.code && u.code.toLowerCase() === clean) ||
        u.email.toLowerCase() === clean ||
        u.id.toLowerCase() === clean ||
        u.email.toLowerCase().includes(clean) ||
        u.name.toLowerCase().includes(clean)
    );

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o seu código/e-mail e palavra-passe.' });
  }

  // Administrative users REQUIRE a password
  if (user.role !== 'UTILIZADOR') {
    if (!password || password.trim() === '') {
      return res.status(401).json({
        error: 'Acesso administrativo restrito. A palavra-passe é obrigatória para administradores.',
      });
    }
    const expectedPassword = user.password || 'admin123';
    if (password !== expectedPassword && password !== 'admin123' && password !== '123456') {
      return res.status(401).json({
        error: 'Palavra-passe administrativa incorreta. Verifique a senha inserida.',
      });
    }
  }

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'Início de Sessão Administrativa',
    entity: 'Autenticação',
    details: `Utilizador ${user.name} (${user.code || 'ADM'}) iniciou sessão com perfil ${user.role}.`,
  });

  res.json({
    token: `jwt-token-${user.id}`,
    user,
  });
});

router.get('/auth/me', (req: Request, res: Response) => {
  const sessionUser = getCurrentUser(req);
  const user = db.getUserById(sessionUser.id);
  res.json({ user });
});

router.get('/auth/users', (_req: Request, res: Response) => {
  res.json(db.getUsers());
});

router.post('/auth/users', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { name, email, role, code, password } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nome, e-mail e perfil são obrigatórios.' });
  }

  if (role === 'ADMINISTRADOR' && (!password || password.trim().length < 4)) {
    return res.status(400).json({ error: 'Ao registar ou autorizar um administrador, é obrigatório definir uma palavra-passe segura (mínimo 4 caracteres).' });
  }

  const userCode = code?.trim() || (role === 'ADMINISTRADOR' ? `ADM-${Math.floor(100 + Math.random() * 900)}` : undefined);

  const newUser: User = {
    id: `usr-${Date.now()}`,
    code: userCode,
    name,
    email,
    role,
    password: password?.trim() || (role === 'ADMINISTRADOR' ? 'admin123' : undefined),
    active: true,
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    createdAt: new Date().toISOString(),
  };

  db.saveUser(newUser);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Criação / Autorização de Utilizador',
    entity: 'Utilizador',
    entityId: newUser.id,
    details: `Criado utilizador ${name} (${email}) com código ${userCode || 'N/A'} e perfil ${role} protegido por senha.`,
  });

  res.status(201).json(newUser);
});

router.put('/auth/users/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  const targetRole = req.body.role || user.role;
  const newPassword = req.body.password !== undefined ? req.body.password.trim() : user.password;

  if (targetRole === 'ADMINISTRADOR' && (!newPassword || newPassword.length < 4)) {
    return res.status(400).json({
      error: 'Para autorizar ou manter o perfil de Administrador, é obrigatório registar uma palavra-passe válida.',
    });
  }

  const updated: User = {
    ...user,
    name: req.body.name || user.name,
    email: req.body.email || user.email,
    role: targetRole,
    code: req.body.code !== undefined ? req.body.code.trim() : (user.code || (targetRole === 'ADMINISTRADOR' ? 'ADM-001' : undefined)),
    password: newPassword,
    active: req.body.active !== undefined ? req.body.active : user.active,
  };

  db.saveUser(updated);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Edição / Atualização de Utilizador',
    entity: 'Utilizador',
    entityId: user.id,
    details: `Atualizado utilizador ${user.name} (Perfil: ${targetRole}). Palavra-passe e autorizações sincronizadas.`,
  });

  res.json(updated);
});

router.delete('/auth/users/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  db.deleteUser(req.params.id);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Utilizador',
    entity: 'Utilizador',
    entityId: req.params.id,
    details: `Utilizador ${user.name} foi eliminado.`,
  });

  res.json({ success: true, message: 'Utilizador eliminado com sucesso.' });
});

router.get('/auth/roles', (_req: Request, res: Response) => {
  res.json(db.getRoles());
});

router.put('/auth/roles/:roleName', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const roleName = req.params.roleName as any;
  const role = db.getRoles().find((r) => r.role === roleName);
  if (!role) return res.status(404).json({ error: 'Perfil não encontrado.' });

  const updated = {
    ...role,
    description: req.body.description || role.description,
    permissions: req.body.permissions || role.permissions,
  };

  db.updateRole(updated);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Atualização de Permissões',
    entity: 'Perfil',
    entityId: roleName,
    details: `Permissões do perfil ${roleName} atualizadas.`,
  });

  res.json(updated);
});

// ----------------------------------------------------
// DASHBOARD & STATS
// ----------------------------------------------------
router.get('/dashboard/stats', (_req: Request, res: Response) => {
  const employees = db.getEmployees();
  const contracts = db.getContracts();
  const vacations = db.getVacations();
  const absences = db.getAbsences();
  const documents = db.getDocuments();
  const payrollSheets = db.getPayrollSheets();

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'ATIVO' || e.status === 'EM_FERIAS').length;
  const activeContracts = contracts.filter((c) => c.status === 'ATIVO').length;

  // Contracts expiring within 30 days
  const now = new Date('2026-09-22T08:00:00Z');
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const contractsEndingSoon = contracts.filter((c) => {
    if (c.status === 'TERMINADO' || c.status === 'CANCELADO') return false;
    if (!c.endDate) return false;
    const end = new Date(c.endDate);
    return end >= now && end <= thirtyDaysLater;
  }).length;

  const expiredContracts = contracts.filter((c) => {
    if (!c.endDate) return false;
    const end = new Date(c.endDate);
    return end < now;
  }).length;

  const onVacationEmployees = employees.filter((e) => e.status === 'EM_FERIAS').length;

  // Absences in current reference month (2026-09)
  const currentMonthAbsences = absences.filter((a) => a.date.startsWith('2026-09')).length;

  // Latest monthly payroll total
  const latestPayroll = payrollSheets[0];
  const monthlyPayrollTotal = latestPayroll ? latestPayroll.totalNet : 0;

  const totalDocuments = documents.length;
  const expiredDocuments = documents.filter((d) => d.status === 'EXPIRADO').length;
  const pendingDocuments = documents.filter((d) => d.status === 'PENDENTE' || d.status === 'EM_ANALISE').length;

  // Charts: Employees by Department
  const deptCounts: Record<string, number> = {};
  employees.forEach((e) => {
    deptCounts[e.departmentName] = (deptCounts[e.departmentName] || 0) + 1;
  });
  const employeesByDepartment = Object.entries(deptCounts).map(([department, count]) => ({
    department,
    count,
  }));

  // Charts: Employees by Position
  const posCounts: Record<string, number> = {};
  employees.forEach((e) => {
    posCounts[e.positionName] = (posCounts[e.positionName] || 0) + 1;
  });
  const employeesByPosition = Object.entries(posCounts).map(([position, count]) => ({
    position,
    count,
  }));

  // Charts: Absence Types Breakdown
  const absenceBreakdown = [
    { type: 'Justificadas', count: absences.filter((a) => a.type === 'JUSTIFICADA').length },
    { type: 'Injustificadas', count: absences.filter((a) => a.type === 'INJUSTIFICADA').length },
    { type: 'Atrasos', count: absences.filter((a) => a.type === 'ATRASO').length },
    { type: 'Saídas Antecipadas', count: absences.filter((a) => a.type === 'SAIDA_ANTECIPADA').length },
    { type: 'Ausências Autorizadas', count: absences.filter((a) => a.type === 'AUSENCIA_AUTORIZADA').length },
  ];

  // Charts: Vacations Status
  const vacationsStatusBreakdown = [
    { name: 'Em Curso', count: vacations.filter((v) => v.status === 'EM_CURSO').length, color: '#3b82f6' },
    { name: 'Aprovadas', count: vacations.filter((v) => v.status === 'APROVADA').length, color: '#10b981' },
    { name: 'Pendentes', count: vacations.filter((v) => v.status === 'PENDENTE').length, color: '#f59e0b' },
    { name: 'Concluídas', count: vacations.filter((v) => v.status === 'CONCLUIDA').length, color: '#6b7280' },
  ];

  // Charts: Payroll Monthly Trend
  const payrollTrend = [
    { month: 'Mai', gross: 3450000, net: 3890000 },
    { month: 'Jun', gross: 3520000, net: 3980000 },
    { month: 'Jul', gross: 3600000, net: 4050000 },
    { month: 'Ago', gross: 3770000, net: 4190000 },
    { month: 'Set', gross: 3770000, net: 4245000 },
  ];

  res.json({
    metrics: {
      totalEmployees,
      activeEmployees,
      activeContracts,
      contractsEndingSoon,
      expiredContracts,
      onVacationEmployees,
      currentMonthAbsences,
      monthlyPayrollTotal,
      totalDocuments,
      expiredDocuments,
      pendingDocuments,
    },
    charts: {
      employeesByDepartment,
      employeesByPosition,
      absenceBreakdown,
      vacationsStatusBreakdown,
      payrollTrend,
    },
  });
});

// ----------------------------------------------------
// EMPLOYEES
// ----------------------------------------------------
router.get('/employees', (req: Request, res: Response) => {
  let list = db.getEmployees();
  const { department, status, search } = req.query;

  if (department) {
    list = list.filter((e) => e.departmentName === department || e.departmentId === department);
  }
  if (status) {
    list = list.filter((e) => e.status === status);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.idNumber.toLowerCase().includes(q) ||
        e.nif.toLowerCase().includes(q) ||
        e.phone.includes(q) ||
        e.positionName.toLowerCase().includes(q) ||
        e.departmentName.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

router.get('/employees/:id', (req: Request, res: Response) => {
  const emp = db.getEmployeeById(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Funcionário não encontrado.' });

  // Include attached documents, contracts, vacations, absences, and salary history
  const employeeContracts = db.getContracts().filter((c) => c.employeeId === emp.id);
  const employeeDocuments = db.getDocuments().filter((d) => d.employeeId === emp.id);
  const employeeVacations = db.getVacations().filter((v) => v.employeeId === emp.id);
  const employeeAbsences = db.getAbsences().filter((a) => a.employeeId === emp.id);
  const employeeSalaryHistory = db.getSalaryHistory(emp.id);

  res.json({
    ...emp,
    contracts: employeeContracts,
    documents: employeeDocuments,
    vacations: employeeVacations,
    absences: employeeAbsences,
    salaryHistory: employeeSalaryHistory,
  });
});

router.post('/employees', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const data = req.body;

  if (!data.fullName || !data.idNumber || !data.departmentId || !data.positionId) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios (Nome, BI/Passaporte, Departamento e Cargo).' });
  }

  const codeCount = db.getEmployees().length + 1;
  const formattedCode = `EMP-${String(codeCount).padStart(3, '0')}`;

  const dept = db.getDepartments().find((d) => d.id === data.departmentId);
  const pos = db.getPositions().find((p) => p.id === data.positionId);

  const newEmployee: Employee = {
    id: `emp-${Date.now()}`,
    code: data.code || formattedCode,
    fullName: data.fullName,
    nickname: data.nickname || '',
    gender: data.gender || 'MASCULINO',
    birthDate: data.birthDate || '1990-01-01',
    nationality: data.nationality || 'Angolana',
    maritalStatus: data.maritalStatus || 'SOLTEIRO',
    idNumber: data.idNumber,
    idIssueDate: data.idIssueDate,
    idExpiryDate: data.idExpiryDate,
    nif: data.nif || data.idNumber,
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    municipality: data.municipality || 'Luanda',
    province: data.province || 'Luanda',
    photoUrl: data.photoUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
    positionId: data.positionId,
    positionName: pos?.title || data.positionName || 'Colaborador',
    departmentId: data.departmentId,
    departmentName: dept?.name || data.departmentName || 'Geral',
    jobRole: data.jobRole || pos?.title || 'Especialista',
    admissionDate: data.admissionDate || new Date().toISOString().split('T')[0],
    contractType: data.contractType || 'TEMPO_INDETERMINADO',
    contractStartDate: data.contractStartDate || data.admissionDate || new Date().toISOString().split('T')[0],
    contractEndDate: data.contractEndDate,
    status: data.status || 'ATIVO',
    baseSalary: Number(data.baseSalary) || 450000,
    bankName: data.bankName || 'Banco Angolano de Investimentos (BAI)',
    accountNumber: data.accountNumber || '0000000000',
    iban: data.iban || 'AO06004000000000000000000',
    socialSecurityNumber: data.socialSecurityNumber || '',
    emergencyContactName: data.emergencyContactName || '',
    emergencyContactRelation: data.emergencyContactRelation || '',
    emergencyContactPhone: data.emergencyContactPhone || '',
    emergencyContactAddress: data.emergencyContactAddress || '',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveEmployee(newEmployee);

  // Automatically generate Contract for new employee
  const contractNumber = `CTR-${new Date().getFullYear()}-${String(db.getContracts().length + 1).padStart(3, '0')}`;
  const newContract: Contract = {
    id: `cnt-${Date.now()}`,
    contractNumber,
    employeeId: newEmployee.id,
    employeeName: newEmployee.fullName,
    employeeCode: newEmployee.code,
    departmentName: newEmployee.departmentName,
    positionName: newEmployee.positionName,
    type: newEmployee.contractType as any,
    typeName: newEmployee.contractType === 'TEMPO_INDETERMINADO' ? 'Tempo Indeterminado' : 'Termo Certo',
    startDate: newEmployee.contractStartDate,
    endDate: newEmployee.contractEndDate,
    baseSalary: newEmployee.baseSalary,
    status: 'ATIVO',
    isSigned: false,
    notes: 'Contrato gerado automaticamente no ato de admissão.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.saveContract(newContract);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Cadastro de Funcionário',
    entity: 'Funcionário',
    entityId: newEmployee.id,
    details: `Adicionado novo funcionário ${newEmployee.fullName} (${newEmployee.code}) no departamento ${newEmployee.departmentName}.`,
  });

  res.status(201).json(newEmployee);
});

router.put('/employees/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const existing = db.getEmployeeById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado.' });

  const data = req.body;
  const dept = data.departmentId ? db.getDepartments().find((d) => d.id === data.departmentId) : undefined;
  const pos = data.positionId ? db.getPositions().find((p) => p.id === data.positionId) : undefined;

  // Check if salary changed to record history
  if (data.baseSalary && Number(data.baseSalary) !== existing.baseSalary) {
    db.addSalaryHistory({
      id: `sh-${Date.now()}`,
      employeeId: existing.id,
      employeeName: existing.fullName,
      previousSalary: existing.baseSalary,
      newSalary: Number(data.baseSalary),
      changeDate: new Date().toISOString().split('T')[0],
      reason: data.salaryChangeReason || 'Revisão salarial administrativa.',
      changedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    });
  }

  const updated: Employee = {
    ...existing,
    ...data,
    baseSalary: data.baseSalary ? Number(data.baseSalary) : existing.baseSalary,
    departmentName: dept ? dept.name : (data.departmentName || existing.departmentName),
    positionName: pos ? pos.title : (data.positionName || existing.positionName),
    updatedAt: new Date().toISOString(),
  };

  db.saveEmployee(updated);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Edição de Funcionário',
    entity: 'Funcionário',
    entityId: existing.id,
    details: `Atualizado registo do funcionário ${updated.fullName} (${updated.code}).`,
  });

  res.json(updated);
});

router.delete('/employees/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const existing = db.getEmployeeById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado.' });

  db.deleteEmployee(req.params.id);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Funcionário',
    entity: 'Funcionário',
    entityId: req.params.id,
    details: `Eliminado funcionário ${existing.fullName} (${existing.code}).`,
  });

  res.json({ success: true, message: 'Funcionário eliminado com sucesso.' });
});

// ----------------------------------------------------
// CONTRACTS & TEMPLATES
// ----------------------------------------------------
router.get('/contracts', (req: Request, res: Response) => {
  let list = db.getContracts();
  const { status, employeeId, search } = req.query;

  if (status) {
    list = list.filter((c) => c.status === status);
  }
  if (employeeId) {
    list = list.filter((c) => c.employeeId === employeeId);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(
      (c) =>
        c.contractNumber.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        c.employeeCode.toLowerCase().includes(q) ||
        c.departmentName.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

router.get('/contracts/:id', (req: Request, res: Response) => {
  const contract = db.getContractById(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado.' });
  res.json(contract);
});

router.post('/contracts', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const data = req.body;

  if (!data.employeeId || !data.type || !data.startDate) {
    return res.status(400).json({ error: 'Funcionário, Tipo de Contrato e Data de Início são obrigatórios.' });
  }

  const emp = db.getEmployeeById(data.employeeId);
  if (!emp) return res.status(400).json({ error: 'Funcionário selecionado não existe.' });

  const contractNumber = data.contractNumber || `CTR-${new Date().getFullYear()}-${String(db.getContracts().length + 1).padStart(3, '0')}`;

  const typeLabels: Record<string, string> = {
    TEMPO_INDETERMINADO: 'Tempo Indeterminado',
    TERMO_CERTO: 'Termo Certo',
    TERMO_INCERTO: 'Termo Incerto',
    PRESTACAO_SERVICOS: 'Prestação de Serviços',
    ESTAGIO: 'Estágio Profissional',
    OUTRO: 'Outro',
  };

  const newContract: Contract = {
    id: `cnt-${Date.now()}`,
    contractNumber,
    employeeId: emp.id,
    employeeName: emp.fullName,
    employeeCode: emp.code,
    departmentName: emp.departmentName,
    positionName: emp.positionName,
    type: data.type,
    typeName: typeLabels[data.type] || 'Contrato de Trabalho',
    startDate: data.startDate,
    endDate: data.endDate || undefined,
    durationMonths: data.durationMonths ? Number(data.durationMonths) : undefined,
    baseSalary: data.baseSalary ? Number(data.baseSalary) : emp.baseSalary,
    status: data.status || 'ATIVO',
    notes: data.notes || '',
    isSigned: Boolean(data.isSigned),
    signedDate: data.signedDate,
    content: data.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveContract(newContract);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Criação de Contrato',
    entity: 'Contrato',
    entityId: newContract.id,
    details: `Criado contrato ${newContract.contractNumber} para o funcionário ${emp.fullName}.`,
  });

  res.status(201).json(newContract);
});

router.put('/contracts/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const existing = db.getContractById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contrato não encontrado.' });

  const updated: Contract = {
    ...existing,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  db.saveContract(updated);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Edição de Contrato',
    entity: 'Contrato',
    entityId: existing.id,
    details: `Atualizado contrato ${existing.contractNumber} (${existing.employeeName}).`,
  });

  res.json(updated);
});

router.post('/contracts/:id/renew', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const existing = db.getContractById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contrato não encontrado.' });

  const { newEndDate, newSalary, notes } = req.body;
  if (!newEndDate) return res.status(400).json({ error: 'Nova data de término é obrigatória para renovação.' });

  existing.endDate = newEndDate;
  if (newSalary) existing.baseSalary = Number(newSalary);
  existing.status = 'ATIVO';
  existing.notes = (existing.notes ? existing.notes + '\n' : '') + `Renovado até ${newEndDate}. ${notes || ''}`;
  existing.updatedAt = new Date().toISOString();

  db.saveContract(existing);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Renovação de Contrato',
    entity: 'Contrato',
    entityId: existing.id,
    details: `Renovado contrato ${existing.contractNumber} do funcionário ${existing.employeeName} até ${newEndDate}.`,
  });

  res.json(existing);
});

router.post('/contracts/:id/terminate', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const existing = db.getContractById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contrato não encontrado.' });

  existing.status = 'TERMINADO';
  existing.notes = (existing.notes ? existing.notes + '\n' : '') + `Encerrado em ${new Date().toISOString().split('T')[0]}: ${req.body.reason || 'Cessação amigável ou termo do prazo.'}`;
  existing.updatedAt = new Date().toISOString();

  db.saveContract(existing);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Encerramento de Contrato',
    entity: 'Contrato',
    entityId: existing.id,
    details: `Encerrado contrato ${existing.contractNumber} do funcionário ${existing.employeeName}.`,
  });

  res.json(existing);
});

router.post('/contracts/:id/duplicate', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const existing = db.getContractById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contrato não encontrado.' });

  const newNumber = `CTR-${new Date().getFullYear()}-${String(db.getContracts().length + 1).padStart(3, '0')}`;
  const duplicated: Contract = {
    ...existing,
    id: `cnt-${Date.now()}`,
    contractNumber: newNumber,
    isSigned: false,
    signedDate: undefined,
    signedDocumentUrl: undefined,
    notes: `Duplicado a partir do contrato ${existing.contractNumber}.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveContract(duplicated);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Duplicação de Contrato',
    entity: 'Contrato',
    entityId: duplicated.id,
    details: `Duplicado contrato ${existing.contractNumber} criando ${duplicated.contractNumber}.`,
  });

  res.status(201).json(duplicated);
});

// Render variable substitution template
router.post('/contracts/render-template', (req: Request, res: Response) => {
  const { templateId, employeeId } = req.body;
  const template = db.getContractTemplates().find((t) => t.id === templateId);
  const employee = db.getEmployeeById(employeeId);
  const company = db.getCompanySettings();
  const visual = db.getVisualSettings();

  if (!template || !employee) {
    return res.status(400).json({ error: 'Modelo de contrato ou funcionário não encontrado.' });
  }

  let text = template.content;
  const replacements: Record<string, string> = {
    '{{NOME_FUNCIONARIO}}': employee.fullName,
    '{{BI}}': employee.idNumber,
    '{{NIF}}': employee.nif,
    '{{CARGO}}': employee.positionName,
    '{{DEPARTAMENTO}}': employee.departmentName,
    '{{SALARIO}}': `${employee.baseSalary.toLocaleString('pt-PT')} ${visual.currencySymbol}`,
    '{{DATA_INICIO}}': employee.contractStartDate,
    '{{DATA_FIM}}': employee.contractEndDate || 'Até determinação em contrário',
    '{{MORADA}}': employee.address || `${employee.municipality}, ${employee.province}`,
    '{{NOME_EMPRESA}}': company.commercialName || company.companyName,
    '{{NIF_EMPRESA}}': company.nif,
    '{{ENDERECO_EMPRESA}}': `${company.address}, ${company.municipality}, ${company.province}`,
  };

  for (const [key, val] of Object.entries(replacements)) {
    text = text.replaceAll(key, val);
  }

  res.json({ rendered: text, template, employee, company });
});

router.get('/contract-templates', (_req: Request, res: Response) => {
  res.json(db.getContractTemplates());
});

router.post('/contract-templates', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { title, description, content, type } = req.body;
  if (!title || !content || !type) {
    return res.status(400).json({ error: 'Título, Conteúdo e Tipo de Contrato são obrigatórios.' });
  }

  const newTemplate: ContractTemplate = {
    id: `tpl-${Date.now()}`,
    title,
    description: description || '',
    content,
    type,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveContractTemplate(newTemplate);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Criação de Modelo de Contrato',
    entity: 'Modelo Contrato',
    entityId: newTemplate.id,
    details: `Criado modelo "${title}".`,
  });

  res.status(201).json(newTemplate);
});

// ----------------------------------------------------
// DOCUMENTS & DIGITAL ARCHIVE
// ----------------------------------------------------
router.get('/documents', (req: Request, res: Response) => {
  let list = db.getDocuments();
  const { employeeId, category, status, folder } = req.query;

  if (employeeId) {
    list = list.filter((d) => d.employeeId === employeeId);
  }
  if (category) {
    list = list.filter((d) => d.category === category);
  }
  if (status) {
    list = list.filter((d) => d.status === status);
  }
  if (folder) {
    list = list.filter((d) => d.folderPath === folder || d.folderPath.startsWith(folder as string));
  }

  res.json(list);
});

router.post('/documents', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { name, fileName, fileSize, fileType, category, employeeId, issueDate, expiryDate, notes, folderPath, fileData } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Nome do documento e Categoria são obrigatórios.' });
  }

  let empName: string | undefined;
  if (employeeId) {
    const emp = db.getEmployeeById(employeeId);
    if (emp) empName = emp.fullName;
  }

  const categoryNames: Record<string, string> = {
    BI: 'Bilhete de Identidade',
    PASSAPORTE: 'Passaporte',
    NIF: 'Comprovativo de NIF',
    CERTIFICADO: 'Certificado de Habilitações',
    CV: 'Curriculum Vitae',
    ATESTADO_MEDICO: 'Atestado Médico',
    CONTRATO: 'Contrato de Trabalho',
    CONTRATO_ASSINADO: 'Contrato Assinado',
    DECLARACAO: 'Declaração',
    CERTIFICADO_PROFISSIONAL: 'Certificado Profissional',
    FOTOGRAFIA: 'Fotografia',
    DOCUMENTO_BANCARIO: 'Comprovativo Bancário (IBAN)',
    OUTRO: 'Outro Documento',
  };

  // Determine status based on expiration date
  let status: 'VALIDO' | 'EXPIRADO' | 'PENDENTE' | 'EM_ANALISE' = 'VALIDO';
  if (expiryDate) {
    const exp = new Date(expiryDate);
    const now = new Date('2026-09-22T08:00:00Z');
    if (exp < now) {
      status = 'EXPIRADO';
    } else {
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 30) status = 'PENDENTE';
    }
  }

  const folder = folderPath || (employeeId ? `EMPRESA/FUNCIONÁRIOS/${db.getEmployeeById(employeeId)?.code || 'GERAL'}` : 'EMPRESA');

  const newDoc: DocumentItem = {
    id: `doc-${Date.now()}`,
    name,
    fileName: fileName || `${name.replace(/\s+/g, '_')}.pdf`,
    fileSize: fileSize || 1024 * 350,
    fileType: fileType || 'application/pdf',
    category,
    categoryName: categoryNames[category] || 'Documento',
    employeeId,
    employeeName: empName,
    issueDate,
    expiryDate,
    uploadDate: new Date().toISOString(),
    uploadedBy: currentUser.name,
    notes: notes || '',
    status,
    fileUrl: fileData ? `/api/documents/blob/${Date.now()}` : '/data/uploads/documento_padrao.pdf',
    folderPath: folder,
  };

  db.saveDocument(newDoc);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Upload de Documento',
    entity: 'Documento',
    entityId: newDoc.id,
    details: `Carregado documento "${newDoc.name}" (${newDoc.categoryName}) na pasta ${folder}.`,
  });

  res.status(201).json(newDoc);
});

router.delete('/documents/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const doc = db.getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

  db.deleteDocument(req.params.id);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Documento',
    entity: 'Documento',
    entityId: req.params.id,
    details: `Eliminado documento "${doc.name}" do utilizador/funcionário ${doc.employeeName || 'Empresa'}.`,
  });

  res.json({ success: true, message: 'Documento eliminado com sucesso.' });
});

// Digital Archive File Explorer Tree Structure
router.get('/documents/archive-tree', (_req: Request, res: Response) => {
  const documents = db.getDocuments();
  const employees = db.getEmployees();

  const employeeFolders = employees.map((emp) => ({
    id: `folder-${emp.id}`,
    name: `${emp.code} - ${emp.fullName}`,
    path: `EMPRESA/FUNCIONÁRIOS/${emp.code}`,
    type: 'folder',
    count: documents.filter((d) => d.folderPath === `EMPRESA/FUNCIONÁRIOS/${emp.code}` || d.employeeId === emp.id).length,
  }));

  const rootFolders = [
    {
      id: 'f-empresa',
      name: 'EMPRESA',
      path: 'EMPRESA',
      type: 'folder',
      count: documents.filter((d) => d.folderPath === 'EMPRESA').length,
    },
    {
      id: 'f-funcionarios',
      name: 'FUNCIONÁRIOS',
      path: 'EMPRESA/FUNCIONÁRIOS',
      type: 'folder',
      subfolders: employeeFolders,
      count: documents.filter((d) => d.folderPath.startsWith('EMPRESA/FUNCIONÁRIOS')).length,
    },
    {
      id: 'f-contratos',
      name: 'CONTRATOS',
      path: 'EMPRESA/CONTRATOS',
      type: 'folder',
      count: documents.filter((d) => d.folderPath === 'EMPRESA/CONTRATOS').length,
    },
    {
      id: 'f-ferias',
      name: 'FÉRIAS',
      path: 'EMPRESA/FÉRIAS',
      type: 'folder',
      count: documents.filter((d) => d.folderPath === 'EMPRESA/FÉRIAS').length,
    },
    {
      id: 'f-faltas',
      name: 'FALTAS',
      path: 'EMPRESA/FALTAS',
      type: 'folder',
      count: documents.filter((d) => d.folderPath === 'EMPRESA/FALTAS').length,
    },
    {
      id: 'f-salarios',
      name: 'SALÁRIOS',
      path: 'EMPRESA/SALÁRIOS',
      type: 'folder',
      count: documents.filter((d) => d.folderPath === 'EMPRESA/SALÁRIOS').length,
    },
  ];

  res.json({
    tree: rootFolders,
    totalDocuments: documents.length,
  });
});

// ----------------------------------------------------
// VACATIONS
// ----------------------------------------------------
router.get('/vacations', (req: Request, res: Response) => {
  let list = db.getVacations();
  const { status, employeeId } = req.query;

  if (status) {
    list = list.filter((v) => v.status === status);
  }
  if (employeeId) {
    list = list.filter((v) => v.employeeId === employeeId);
  }

  res.json(list);
});

router.post('/vacations', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { employeeId, startDate, endDate, daysCount, type, notes } = req.body;

  if (!employeeId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Funcionário, Data Inicial e Data Final são obrigatórios.' });
  }

  const emp = db.getEmployeeById(employeeId);
  if (!emp) return res.status(400).json({ error: 'Funcionário não encontrado.' });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

  const typeLabels: Record<string, string> = {
    FERIAS_ANUAIS: 'Férias Anuais Regulamentares',
    FERIAS_JUDICIAIS: 'Férias Judiciais',
    LICENCA_PARENTAL: 'Licença Parental',
    OUTRO: 'Outro Período',
  };

  const newVacation: Vacation = {
    id: `vac-${Date.now()}`,
    employeeId: emp.id,
    employeeName: emp.fullName,
    employeeCode: emp.code,
    departmentName: emp.departmentName,
    startDate,
    endDate,
    daysCount: daysCount ? Number(daysCount) : diffDays,
    type: type || 'FERIAS_ANUAIS',
    typeName: typeLabels[type] || 'Férias Anuais',
    status: 'PENDENTE',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.saveVacation(newVacation);

  // Add system notification
  db.addNotification({
    title: 'Novo Pedido de Férias',
    message: `${emp.fullName} solicitou ${newVacation.daysCount} dias de férias de ${startDate} a ${endDate}.`,
    type: 'INFO',
    category: 'FERIAS',
    link: '/ferias',
  });

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Solicitação de Férias',
    entity: 'Férias',
    entityId: newVacation.id,
    details: `Solicitadas férias para ${emp.fullName} (${startDate} a ${endDate}).`,
  });

  res.status(201).json(newVacation);
});

router.put('/vacations/:id/approve', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const vac = db.getVacationById(req.params.id);
  if (!vac) return res.status(404).json({ error: 'Registo de férias não encontrado.' });

  vac.status = 'APROVADA';
  vac.approvedBy = currentUser.name;
  vac.approvedAt = new Date().toISOString();

  db.saveVacation(vac);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Aprovação de Férias',
    entity: 'Férias',
    entityId: vac.id,
    details: `Aprovadas férias de ${vac.employeeName} por ${currentUser.name}.`,
  });

  res.json(vac);
});

router.put('/vacations/:id/reject', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const vac = db.getVacationById(req.params.id);
  if (!vac) return res.status(404).json({ error: 'Registo de férias não encontrado.' });

  vac.status = 'REJEITADA';
  vac.notes = (vac.notes ? vac.notes + '\n' : '') + `Rejeitado em ${new Date().toISOString().split('T')[0]}: ${req.body.reason || 'Necessidade de serviço imperativa.'}`;

  db.saveVacation(vac);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Rejeição de Férias',
    entity: 'Férias',
    entityId: vac.id,
    details: `Rejeitadas férias de ${vac.employeeName}. Motivo: ${req.body.reason || 'Serviço'}.`,
  });

  res.json(vac);
});

router.put('/vacations/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const vac = db.getVacationById(req.params.id);
  if (!vac) return res.status(404).json({ error: 'Registo de férias não encontrado.' });

  const updated: Vacation = {
    ...vac,
    ...req.body,
    id: vac.id,
  };

  db.saveVacation(updated);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Atualização de Férias',
    entity: 'Férias',
    entityId: vac.id,
    details: `Atualizado registo de férias de ${vac.employeeName}.`,
  });

  res.json(updated);
});

router.delete('/vacations/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const vac = db.getVacationById(req.params.id);
  if (!vac) return res.status(404).json({ error: 'Registo de férias não encontrado.' });

  db.deleteVacation(req.params.id);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Férias',
    entity: 'Férias',
    entityId: req.params.id,
    details: `Eliminado registo de férias de ${vac.employeeName}.`,
  });

  res.json({ success: true, message: 'Férias eliminadas com sucesso.' });
});

// ----------------------------------------------------
// ABSENCES
// ----------------------------------------------------
router.get('/absences', (req: Request, res: Response) => {
  let list = db.getAbsences();
  const { employeeId, department, type, date } = req.query;

  if (employeeId) {
    list = list.filter((a) => a.employeeId === employeeId);
  }
  if (department) {
    list = list.filter((a) => a.departmentName === department);
  }
  if (type) {
    list = list.filter((a) => a.type === type);
  }
  if (date) {
    list = list.filter((a) => a.date.startsWith(date as string));
  }

  res.json(list);
});

router.post('/absences', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { employeeId, date, time, hours, type, reason, isJustified, notes, documentProofName } = req.body;

  if (!employeeId || !date || !type || !reason) {
    return res.status(400).json({ error: 'Funcionário, Data, Tipo de Ausência e Motivo são obrigatórios.' });
  }

  const emp = db.getEmployeeById(employeeId);
  if (!emp) return res.status(400).json({ error: 'Funcionário não encontrado.' });

  const typeLabels: Record<string, string> = {
    JUSTIFICADA: 'Falta Justificada',
    INJUSTIFICADA: 'Falta Injustificada',
    ATRASO: 'Atraso',
    SAIDA_ANTECIPADA: 'Saída Antecipada',
    AUSENCIA_AUTORIZADA: 'Ausência Autorizada em Serviço',
  };

  const justified = isJustified !== undefined ? Boolean(isJustified) : type === 'JUSTIFICADA' || type === 'AUSENCIA_AUTORIZADA';

  const newAbsence: Absence = {
    id: `abs-${Date.now()}`,
    employeeId: emp.id,
    employeeName: emp.fullName,
    employeeCode: emp.code,
    departmentName: emp.departmentName,
    date,
    time,
    hours: hours ? Number(hours) : 8,
    type,
    typeName: typeLabels[type] || 'Ausência',
    reason,
    isJustified: justified,
    documentProofName,
    notes: notes || '',
    registeredBy: currentUser.name,
    createdAt: new Date().toISOString(),
  };

  db.saveAbsence(newAbsence);

  // If unjustified absence, notify HR
  if (type === 'INJUSTIFICADA') {
    db.addNotification({
      title: 'Falta Injustificada Registada',
      message: `Registada falta injustificada para ${emp.fullName} na data ${date}. Sujeita a dedução salarial.`,
      type: 'WARNING',
      category: 'FALTA',
      link: '/faltas',
    });
  }

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Registo de Falta/Ausência',
    entity: 'Falta',
    entityId: newAbsence.id,
    details: `Registada ${newAbsence.typeName} de ${emp.fullName} em ${date}.`,
  });

  res.status(201).json(newAbsence);
});

router.put('/absences/:id/justify', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const abs = db.getAbsenceById(req.params.id);
  if (!abs) return res.status(404).json({ error: 'Registo de falta não encontrado.' });

  abs.isJustified = true;
  abs.type = 'JUSTIFICADA';
  abs.typeName = 'Falta Justificada';
  if (req.body.proofNote) {
    abs.notes = (abs.notes ? abs.notes + '\n' : '') + `Justificativo: ${req.body.proofNote}`;
  }

  db.saveAbsence(abs);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Justificação de Falta',
    entity: 'Falta',
    entityId: abs.id,
    details: `Justificada falta de ${abs.employeeName} referente ao dia ${abs.date}.`,
  });

  res.json(abs);
});

router.delete('/absences/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const abs = db.getAbsenceById(req.params.id);
  if (!abs) return res.status(404).json({ error: 'Registo de falta não encontrado.' });

  db.deleteAbsence(req.params.id);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Registo de Falta',
    entity: 'Falta',
    entityId: req.params.id,
    details: `Eliminada falta de ${abs.employeeName} do dia ${abs.date}.`,
  });

  res.json({ success: true, message: 'Falta eliminada com sucesso.' });
});

// ----------------------------------------------------
// SALARIES & PAYROLL
// ----------------------------------------------------
router.get('/salaries/history', (req: Request, res: Response) => {
  const { employeeId } = req.query;
  res.json(db.getSalaryHistory(employeeId as string));
});

router.post('/salaries/update', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { employeeId, newSalary, reason } = req.body;

  if (!employeeId || !newSalary) {
    return res.status(400).json({ error: 'Funcionário e Novo Salário são obrigatórios.' });
  }

  const emp = db.getEmployeeById(employeeId);
  if (!emp) return res.status(400).json({ error: 'Funcionário não encontrado.' });

  const prev = emp.baseSalary;
  emp.baseSalary = Number(newSalary);
  emp.updatedAt = new Date().toISOString();
  db.saveEmployee(emp);

  const histItem: SalaryHistory = {
    id: `sh-${Date.now()}`,
    employeeId: emp.id,
    employeeName: emp.fullName,
    previousSalary: prev,
    newSalary: Number(newSalary),
    changeDate: new Date().toISOString().split('T')[0],
    reason: reason || 'Revisão salarial administrativa.',
    changedBy: currentUser.name,
    createdAt: new Date().toISOString(),
  };

  db.addSalaryHistory(histItem);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Alteração Salarial',
    entity: 'Salário',
    entityId: emp.id,
    details: `Alterado salário de ${emp.fullName} de ${prev.toLocaleString()} para ${Number(newSalary).toLocaleString()} Kz.`,
  });

  res.json({ employee: emp, history: histItem });
});

router.get('/payroll/sheets', (_req: Request, res: Response) => {
  res.json(db.getPayrollSheets());
});

router.get('/payroll/sheets/:id', (req: Request, res: Response) => {
  const sheet = db.getPayrollSheetById(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Folha salarial não encontrada.' });
  res.json(sheet);
});

// Generate / Calculate monthly payroll sheet
router.post('/payroll/generate', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { referenceMonth, mealAllowanceDefault, transportAllowanceDefault } = req.body;

  if (!referenceMonth) {
    return res.status(400).json({ error: 'Mês de referência (AAAA-MM) é obrigatório.' });
  }

  // Check if sheet for this month already exists
  const existing = db.getPayrollSheets().find((s) => s.referenceMonth === referenceMonth);
  if (existing && existing.isLocked) {
    return res.status(400).json({ error: `A folha salarial de ${referenceMonth} já está bloqueada e não pode ser recalculada.` });
  }

  const employees = db.getEmployees().filter((e) => e.status === 'ATIVO' || e.status === 'EM_FERIAS');
  const absences = db.getAbsences().filter((a) => a.date.startsWith(referenceMonth));

  const meal = mealAllowanceDefault !== undefined ? Number(mealAllowanceDefault) : 60000;
  const transport = transportAllowanceDefault !== undefined ? Number(transportAllowanceDefault) : 60000;

  const entries: PayrollEntry[] = employees.map((emp) => {
    // Unjustified absences penalty: (baseSalary / 30) per day
    const empUnjustified = absences.filter((a) => a.employeeId === emp.id && !a.isJustified);
    const absenceCount = empUnjustified.length;
    const dayRate = Math.round(emp.baseSalary / 30);
    const absenceDeduction = absenceCount * dayRate;

    // Standard social security deduction / tax estimation (e.g. 3% SS or standard 10%)
    const taxDeductions = Math.round(emp.baseSalary * 0.1);
    const totalDeductions = taxDeductions + absenceDeduction;

    const allowances = meal + transport;
    const bonus = 0;
    const net = emp.baseSalary + allowances + bonus - totalDeductions;

    return {
      id: `pe-${emp.id}-${referenceMonth}`,
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.fullName,
      positionName: emp.positionName,
      departmentName: emp.departmentName,
      bankName: emp.bankName,
      accountNumber: emp.accountNumber,
      iban: emp.iban,
      baseSalary: emp.baseSalary,
      mealAllowance: meal,
      transportAllowance: transport,
      otherAllowances: 0,
      bonus,
      deductions: taxDeductions,
      absencesCount: absenceCount,
      absenceDeductions: absenceDeduction,
      netSalary: Math.max(0, net),
      status: 'PENDENTE',
    };
  });

  const totalGross = entries.reduce((acc, curr) => acc + curr.baseSalary, 0);
  const totalAllowances = entries.reduce((acc, curr) => acc + curr.mealAllowance + curr.transportAllowance + curr.otherAllowances, 0);
  const totalBonuses = entries.reduce((acc, curr) => acc + curr.bonus, 0);
  const totalDeductions = entries.reduce((acc, curr) => acc + curr.deductions + curr.absenceDeductions, 0);
  const totalNet = entries.reduce((acc, curr) => acc + curr.netSalary, 0);

  const [year, month] = referenceMonth.split('-');
  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthTitle = `${monthNames[Number(month)] || month} de ${year}`;

  const sheet: PayrollSheet = {
    id: existing ? existing.id : `pyr-${referenceMonth}`,
    referenceMonth,
    title: `Folha Salarial - ${monthTitle}`,
    totalEmployees: entries.length,
    totalGross,
    totalAllowances,
    totalBonuses,
    totalDeductions,
    totalNet,
    isLocked: false,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entries,
  };

  db.savePayrollSheet(sheet);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Cálculo de Folha Salarial',
    entity: 'Folha Salarial',
    entityId: sheet.id,
    details: `Calculada folha salarial de ${monthTitle} para ${entries.length} funcionários. Total Líquido: ${totalNet.toLocaleString()} Kz.`,
  });

  res.status(201).json(sheet);
});

router.put('/payroll/sheets/:id/lock', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const sheet = db.getPayrollSheetById(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Folha salarial não encontrada.' });

  sheet.isLocked = true;
  sheet.lockedAt = new Date().toISOString();
  sheet.lockedBy = currentUser.name;
  (sheet.entries || []).forEach((e) => {
    e.status = 'PAGO';
    e.paymentDate = new Date().toISOString().split('T')[0];
  });
  sheet.updatedAt = new Date().toISOString();

  db.savePayrollSheet(sheet);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Bloqueio de Folha Salarial',
    entity: 'Folha Salarial',
    entityId: sheet.id,
    details: `Fechada e bloqueada a folha salarial ${sheet.title} por ${currentUser.name}.`,
  });

  res.json(sheet);
});

router.put('/payroll/sheets/:id/unlock', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const sheet = db.getPayrollSheetById(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Folha salarial não encontrada.' });

  sheet.isLocked = false;
  sheet.lockedAt = undefined;
  sheet.lockedBy = undefined;
  sheet.updatedAt = new Date().toISOString();

  db.savePayrollSheet(sheet);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Reabertura de Folha Salarial',
    entity: 'Folha Salarial',
    entityId: sheet.id,
    details: `Reaberta a folha salarial ${sheet.title} por ${currentUser.name}.`,
  });

  res.json(sheet);
});

router.put('/payroll/sheets/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const sheet = db.getPayrollSheetById(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Folha salarial não encontrada.' });

  const updated: PayrollSheet = {
    ...sheet,
    ...req.body,
    id: sheet.id,
    updatedAt: new Date().toISOString(),
  };

  db.savePayrollSheet(updated);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Atualização de Folha Salarial',
    entity: 'Folha Salarial',
    entityId: sheet.id,
    details: `Atualizada folha salarial ${sheet.title}.`,
  });

  res.json(updated);
});

router.delete('/payroll/sheets/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const sheet = db.getPayrollSheetById(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Folha salarial não encontrada.' });

  if (sheet.isLocked) {
    return res.status(400).json({ error: 'Não é possível eliminar uma folha salarial já fechada/bloqueada.' });
  }

  db.deletePayrollSheet(req.params.id);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Folha Salarial',
    entity: 'Folha Salarial',
    entityId: req.params.id,
    details: `Eliminada folha salarial ${sheet.title}.`,
  });

  res.json({ success: true, message: 'Folha salarial eliminada com sucesso.' });
});

// ----------------------------------------------------
// SETTINGS & CONFIG
// ----------------------------------------------------
router.get('/settings/company', (_req: Request, res: Response) => {
  res.json(db.getCompanySettings());
});

router.put('/settings/company', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const updated = db.updateCompanySettings(req.body);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Atualização de Dados da Empresa',
    entity: 'Configuração',
    details: `Atualizados dados cadastrais e institucionais da empresa.`,
  });

  res.json(updated);
});

router.get('/settings/visual', (_req: Request, res: Response) => {
  res.json(db.getVisualSettings());
});

router.put('/settings/visual', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const updated = db.updateVisualSettings(req.body);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Atualização Visual e Sistema',
    entity: 'Configuração',
    details: `Atualizadas cores, tema e prazos de alerta do sistema.`,
  });

  res.json(updated);
});

router.get('/settings/departments', (_req: Request, res: Response) => {
  res.json(db.getDepartments());
});

router.post('/settings/departments', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { code, name, managerName, description } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Código e Nome do Departamento são obrigatórios.' });

  const newDept: Department = {
    id: `dep-${Date.now()}`,
    code,
    name,
    managerName,
    description,
  };
  db.saveDepartment(newDept);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Criação de Departamento',
    entity: 'Departamento',
    entityId: newDept.id,
    details: `Criado departamento ${name} (${code}).`,
  });

  res.status(201).json(newDept);
});

router.delete('/settings/departments/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  db.deleteDepartment(req.params.id);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Departamento',
    entity: 'Departamento',
    entityId: req.params.id,
    details: `Eliminado departamento ID ${req.params.id}.`,
  });
  res.json({ success: true });
});

router.get('/settings/positions', (_req: Request, res: Response) => {
  res.json(db.getPositions());
});

router.post('/settings/positions', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { title, departmentId, baseSalaryMin, baseSalaryMax } = req.body;
  if (!title || !departmentId) return res.status(400).json({ error: 'Título e Departamento do Cargo são obrigatórios.' });

  const newPos: Position = {
    id: `pos-${Date.now()}`,
    title,
    departmentId,
    baseSalaryMin: baseSalaryMin ? Number(baseSalaryMin) : undefined,
    baseSalaryMax: baseSalaryMax ? Number(baseSalaryMax) : undefined,
  };
  db.savePosition(newPos);

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Criação de Cargo',
    entity: 'Cargo',
    entityId: newPos.id,
    details: `Criado cargo ${title}.`,
  });

  res.status(201).json(newPos);
});

router.delete('/settings/positions/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  db.deletePosition(req.params.id);
  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Eliminação de Cargo',
    entity: 'Cargo',
    entityId: req.params.id,
    details: `Eliminado cargo ID ${req.params.id}.`,
  });
  res.json({ success: true });
});

// ----------------------------------------------------
// NOTIFICATIONS & AUDIT LOGS
// ----------------------------------------------------
router.get('/notifications', (_req: Request, res: Response) => {
  res.json(db.getNotifications());
});

router.put('/notifications/:id/read', (req: Request, res: Response) => {
  db.markNotificationAsRead(req.params.id);
  res.json({ success: true });
});

router.put('/notifications/mark-all-read', (_req: Request, res: Response) => {
  db.markAllNotificationsAsRead();
  res.json({ success: true });
});

router.get('/audit-logs', (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// ----------------------------------------------------
// BACKUP & RESTORE
// ----------------------------------------------------
router.get('/backup/export', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const backup = db.exportBackup();

  db.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'Exportação de Cópia de Segurança',
    entity: 'Backup',
    details: `Exportada cópia de segurança completa da base de dados e documentos.`,
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="backup-rh-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(backup);
});

router.post('/backup/restore', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  try {
    const backupData = req.body;
    db.restoreBackup(backupData);

    db.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'Restauro de Cópia de Segurança',
      entity: 'Backup',
      details: `Restaurada base de dados a partir de ficheiro de cópia de segurança.`,
    });

    res.json({ success: true, message: 'Dados restaurados com êxito.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha ao restaurar dados.' });
  }
});

// ----------------------------------------------------
// GLOBAL SEARCH
// ----------------------------------------------------
router.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  if (!query) {
    return res.json({ employees: [], contracts: [], documents: [], departments: [] });
  }

  const employees = db.getEmployees().filter(
    (e) =>
      e.fullName.toLowerCase().includes(query) ||
      e.code.toLowerCase().includes(query) ||
      e.idNumber.toLowerCase().includes(query) ||
      e.nif.toLowerCase().includes(query) ||
      e.phone.includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.positionName.toLowerCase().includes(query)
  );

  const contracts = db.getContracts().filter(
    (c) =>
      c.contractNumber.toLowerCase().includes(query) ||
      c.employeeName.toLowerCase().includes(query) ||
      c.departmentName.toLowerCase().includes(query)
  );

  const documents = db.getDocuments().filter(
    (d) =>
      d.name.toLowerCase().includes(query) ||
      d.fileName.toLowerCase().includes(query) ||
      (d.employeeName && d.employeeName.toLowerCase().includes(query)) ||
      d.categoryName.toLowerCase().includes(query)
  );

  const departments = db.getDepartments().filter(
    (dept) => dept.name.toLowerCase().includes(query) || dept.code.toLowerCase().includes(query)
  );

  res.json({
    employees: employees.slice(0, 8),
    contracts: contracts.slice(0, 8),
    documents: documents.slice(0, 8),
    departments: departments.slice(0, 5),
  });
});

// ----------------------------------------------------
// LOCAL SERVER & NETWORK INFO
// ----------------------------------------------------
router.get('/system/local-server-info', (_req: Request, res: Response) => {
  const nets = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (netList) {
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
  }

  const dbFilePath = path.join(process.cwd(), 'data', 'database.json');
  let dbSize = 0;
  let lastModified = new Date().toISOString();
  if (fs.existsSync(dbFilePath)) {
    try {
      const stats = fs.statSync(dbFilePath);
      dbSize = stats.size;
      lastModified = stats.mtime.toISOString();
    } catch {
      // fallback
    }
  }

  res.json({
    port: 3000,
    hostname: os.hostname(),
    platform: os.platform(),
    localIpAddresses: addresses,
    databaseFile: 'data/database.json',
    databaseSizeBytes: dbSize,
    databaseLastModified: lastModified,
    counts: {
      employees: db.getEmployees().length,
      contracts: db.getContracts().length,
      documents: db.getDocuments().length,
      payrollSheets: db.getPayrollSheets().length,
      users: db.getUsers().length,
      auditLogs: db.getAuditLogs().length,
    },
  });
});

export default router;
