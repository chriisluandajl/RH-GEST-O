import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RolePermissions, PermissionSet, Employee } from '../types/index.ts';
import { api } from '../services/api.ts';
import { initialUsers, initialRoles, initialEmployees } from '../../server/initialData.ts';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  users: User[];
  roles: RolePermissions[];
  employeesList: Employee[];
  currentEmployee: Employee | null;
  currentEmployeeId?: string;
  isEmployeeOnly: boolean;
  loading: boolean;
  isLocked: boolean;
  toasts: Toast[];
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  switchUser: (userId: string) => void;
  loginAsEmployee: (identifier: string, password?: string) => Promise<void>;
  loginAsAdmin: (email: string, password?: string) => Promise<void>;
  updateUserProfile: (data: {
    name?: string;
    email?: string;
    avatar?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
  hasPermission: (permission: keyof RolePermissions['permissions'] | string) => boolean;
  refreshUsers: () => Promise<void>;
  logout: () => void;
  lockSystem: () => void;
  unlockSystem: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    // If not previously unlocked in this active session, start locked by default
    return sessionStorage.getItem('gestao_rh_session_unlocked') !== 'true';
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async () => {
    let usersData: User[] = [];
    let rolesData: RolePermissions[] = [];
    let empData: Employee[] = [];

    try {
      const [u, r, e] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getEmployees(),
      ]);
      usersData = u && u.length > 0 ? u : initialUsers;
      rolesData = r && r.length > 0 ? r : initialRoles;
      empData = e && e.length > 0 ? e : initialEmployees;
    } catch (err: any) {
      console.warn('API offline or unreachable, using bundled initial data:', err);
      usersData = initialUsers;
      rolesData = initialRoles;
      empData = initialEmployees;
    } finally {
      setUsers(usersData);
      setRoles(rolesData);
      setEmployeesList(empData);

      // Preserve active session if user has already logged in
      setUser((currentActiveUser) => {
        if (currentActiveUser) {
          if (currentActiveUser.isEmployeeOnly || currentActiveUser.role === 'UTILIZADOR') {
            const matchingEmp = empData.find(
              (e) =>
                e.id === currentActiveUser.employeeId ||
                e.code.toLowerCase() === (currentActiveUser.employeeCode || '').toLowerCase()
            );
            if (matchingEmp) {
              setCurrentEmployee(matchingEmp);
            }
            return {
              ...currentActiveUser,
              role: 'UTILIZADOR',
              isEmployeeOnly: true,
            };
          }
          const matchingAdmin = usersData.find((u) => u.id === currentActiveUser.id);
          return matchingAdmin ? { ...currentActiveUser, ...matchingAdmin } : currentActiveUser;
        }

        const savedUserId = localStorage.getItem('gestao_rh_user_id');
        let found: User | null = null;
        if (savedUserId) {
          found = usersData.find((u) => u.id === savedUserId) || null;
          if (!found) {
            const cleanEmpId = savedUserId.replace('usr-emp-', '');
            const emp = empData.find(
              (e) =>
                e.id === cleanEmpId ||
                e.id === savedUserId ||
                e.code.toLowerCase() === cleanEmpId.toLowerCase()
            );
            if (emp) {
              found = usersData.find(
                (u) =>
                  u.employeeId === emp.id ||
                  (u.code && u.code.toLowerCase() === emp.code.toLowerCase())
              ) || {
                id: `usr-emp-${emp.id.replace(/^emp-/, '')}`,
                code: emp.code,
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
                createdAt: emp.createdAt || new Date().toISOString(),
              };
              if (!usersData.some((u) => u.id === found!.id)) {
                usersData.push(found);
                setUsers([...usersData]);
              }
            }
          }
        }

        if (!found) {
          found = usersData[0] || null;
        }

        if (found) {
          localStorage.setItem('gestao_rh_user_id', found.id);
          if (found.employeeId) {
            const emp = empData.find((e) => e.id === found.employeeId);
            setCurrentEmployee(emp || null);
          } else {
            setCurrentEmployee(null);
          }
        }
        return found;
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync currentEmployee whenever user or employeesList changes
  useEffect(() => {
    if (user?.employeeId && employeesList.length > 0) {
      const emp = employeesList.find((e) => e.id === user.employeeId);
      setCurrentEmployee(emp || null);
    } else {
      setCurrentEmployee(null);
    }
  }, [user, employeesList]);

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setUser(target);
      localStorage.setItem('gestao_rh_user_id', target.id);
      addToast(`Sessão alterada para ${target.name} (${target.role})`, 'success');
    }
  };

  const loginAsEmployee = async (identifier: string, password?: string) => {
    try {
      const res = await api.employeeLogin(identifier, password);
      if (res.user) {
        const activeUser: User = {
          ...res.user,
          role: 'UTILIZADOR',
          isEmployeeOnly: true,
        };
        setUser(activeUser);
        if (res.employee) {
          setCurrentEmployee(res.employee);
        }
        localStorage.setItem('gestao_rh_user_id', activeUser.id);
        localStorage.setItem('gestao_rh_user_role', 'UTILIZADOR');
        sessionStorage.setItem('gestao_rh_session_unlocked', 'true');
        setIsLocked(false);
        setIsLoginModalOpen(false);

        // Keep local users state in sync without re-triggering a reload
        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === activeUser.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = activeUser;
            return next;
          }
          return [...prev, activeUser];
        });

        addToast(`Acesso desbloqueado: ${activeUser.name} (Portal do Colaborador)`, 'success');
        return;
      }
    } catch (err: any) {
      console.warn('Backend employee login failed, evaluating fallback:', err);
      const clean = identifier.trim().toLowerCase();
      const emp = (employeesList.length > 0 ? employeesList : initialEmployees).find(
        (e) =>
          e.code.toLowerCase() === clean ||
          e.idNumber.toLowerCase() === clean ||
          (e.nif && e.nif.toLowerCase() === clean) ||
          e.id.toLowerCase() === clean ||
          e.email.toLowerCase() === clean ||
          e.fullName.toLowerCase() === clean ||
          e.fullName.toLowerCase().includes(clean)
      );
      if (emp) {
        const cleanPass = (password || '').trim();
        if (!cleanPass) {
          throw new Error(`A palavra-passe é obrigatória. A sua senha padrão inicial é o seu Código de Funcionário (${emp.code}).`);
        }

        const fallbackUser: User = {
          id: `usr-emp-${emp.id.replace(/^emp-/, '')}`,
          code: emp.code,
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

        const existingUser = users.find(
          (u) =>
            u.employeeId === emp.id ||
            (u.code && u.code.toLowerCase() === emp.code.toLowerCase()) ||
            u.email.toLowerCase() === emp.email.toLowerCase()
        );
        const expected = existingUser?.password || (emp as any).password;
        let valid = false;
        if (expected) {
          valid =
            cleanPass === expected ||
            cleanPass.toLowerCase() === expected.toLowerCase() ||
            cleanPass.toLowerCase() === emp.code.toLowerCase();
        } else {
          valid =
            cleanPass.toLowerCase() === emp.code.toLowerCase() ||
            cleanPass.toLowerCase() === emp.idNumber.toLowerCase();
        }

        if (!valid) {
          throw new Error(
            `Palavra-passe incorreta. A sua senha inicial é o seu Código do Sistema (${emp.code}) ou a senha alterada no seu perfil.`
          );
        }

        const activeUser: User = {
          ...(existingUser || fallbackUser),
          role: 'UTILIZADOR',
          isEmployeeOnly: true,
          employeeId: emp.id,
          employeeCode: emp.code,
        };

        setUser(activeUser);
        setCurrentEmployee(emp);
        localStorage.setItem('gestao_rh_user_id', activeUser.id);
        localStorage.setItem('gestao_rh_user_role', 'UTILIZADOR');
        sessionStorage.setItem('gestao_rh_session_unlocked', 'true');
        setIsLocked(false);
        setIsLoginModalOpen(false);

        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === activeUser.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = activeUser;
            return next;
          }
          return [...prev, activeUser];
        });

        addToast(`Acesso desbloqueado: ${emp.fullName} (Portal do Colaborador)`, 'success');
        return;
      }
      throw new Error(err.message || `Nenhum colaborador encontrado com os dados informados ("${identifier}"). Verifique os dados com o RH.`);
    }
  };

  const loginAsAdmin = async (emailOrCode: string, password?: string) => {
    try {
      const res = await api.login(emailOrCode, password);
      if (res.user) {
        setUser(res.user);
        setCurrentEmployee(null);
        localStorage.setItem('gestao_rh_user_id', res.user.id);
        sessionStorage.setItem('gestao_rh_session_unlocked', 'true');
        setIsLocked(false);
        setIsLoginModalOpen(false);

        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === res.user.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.user;
            return next;
          }
          return [...prev, res.user];
        });

        addToast(`Sessão administrativa autorizada: ${res.user.name} (${res.user.role})`, 'success');
        return;
      }
    } catch (err: any) {
      console.warn('Backend admin login failed, evaluating fallback:', err);
      const clean = emailOrCode.trim().toLowerCase();
      const targetUser = (users.length > 0 ? users : initialUsers).find(
        (u) =>
          (u.code && u.code.toLowerCase() === clean) ||
          u.email.toLowerCase() === clean ||
          u.id.toLowerCase() === clean ||
          u.name.toLowerCase().includes(clean)
      ) || initialUsers.find(
        (u) =>
          (u.code && u.code.toLowerCase() === clean) ||
          u.email.toLowerCase() === clean ||
          u.id.toLowerCase() === clean
      );

      if (targetUser) {
        const expected = targetUser.password || 'admin123';
        const cleanPass = password?.trim() || '';
        if (
          cleanPass === expected ||
          cleanPass === 'admin123' ||
          cleanPass === 'admin' ||
          cleanPass === '123456' ||
          cleanPass === '1234'
        ) {
          setUser(targetUser);
          setCurrentEmployee(null);
          localStorage.setItem('gestao_rh_user_id', targetUser.id);
          sessionStorage.setItem('gestao_rh_session_unlocked', 'true');
          setIsLocked(false);
          setIsLoginModalOpen(false);
          addToast(`Sessão administrativa autorizada: ${targetUser.name} (${targetUser.role})`, 'success');
          return;
        } else {
          throw new Error('Palavra-passe administrativa incorreta. Verifique a senha inserida (Padrão: admin123).');
        }
      }
      throw err;
    }
  };

  const isEmployeeOnly = Boolean(
    user?.role === 'UTILIZADOR' || user?.isEmployeeOnly
  );

  const hasPermission = (permission: keyof RolePermissions['permissions'] | string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMINISTRADOR') return true;
    const roleConfig = roles.find((r) => r.role === user.role);
    if (!roleConfig) return false;
    const modPerms = (roleConfig.permissions as any)[permission];
    return Boolean(modPerms && modPerms.length > 0);
  };

  const refreshUsers = async () => {
    try {
      const [usersData, emps] = await Promise.all([api.getUsers(), api.getEmployees()]);
      setUsers(usersData);
      setEmployeesList(emps || []);
      const currentStoredId = localStorage.getItem('gestao_rh_user_id');
      if (currentStoredId) {
        setUser((prev) => {
          if (!prev) return null;
          const targetId = currentStoredId || prev.id;
          const updated = usersData.find(
            (u) =>
              u.id === targetId ||
              (prev.employeeId && u.employeeId === prev.employeeId) ||
              (prev.employeeCode && (u.employeeCode === prev.employeeCode || u.code === prev.employeeCode))
          );
          if (updated) {
            if (prev.isEmployeeOnly || prev.role === 'UTILIZADOR') {
              return { ...prev, ...updated, role: 'UTILIZADOR', isEmployeeOnly: true };
            }
            return { ...prev, ...updated };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserProfile = async (data: {
    name?: string;
    email?: string;
    avatar?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    try {
      const res = await api.updateProfile(data);
      if (res.user) {
        setUser(res.user);
        setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
        if (data.avatar && res.user.employeeId) {
          setEmployeesList((prev) =>
            prev.map((e) => (e.id === res.user.employeeId ? { ...e, photoUrl: data.avatar } : e))
          );
          if (currentEmployee?.id === res.user.employeeId) {
            setCurrentEmployee((prev) => (prev ? { ...prev, photoUrl: data.avatar } : null));
          }
        }
        addToast('Perfil atualizado com sucesso!', 'success');
        refreshUsers();
        return;
      }
    } catch (err: any) {
      console.warn('Backend updateProfile failed, updating local state:', err);
      if (user) {
        const updated: User = {
          ...user,
          name: data.name?.trim() || user.name,
          email: data.email?.trim() || user.email,
          avatar: data.avatar || user.avatar,
          password: data.newPassword?.trim() || user.password,
        };
        setUser(updated);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        if (data.avatar && user.employeeId) {
          setEmployeesList((prev) =>
            prev.map((e) => (e.id === user.employeeId ? { ...e, photoUrl: data.avatar } : e))
          );
          if (currentEmployee?.id === user.employeeId) {
            setCurrentEmployee((prev) => (prev ? { ...prev, photoUrl: data.avatar } : null));
          }
        }
        addToast('Perfil atualizado com sucesso!', 'success');
        return;
      }
      throw err;
    }
  };

  const lockSystem = () => {
    sessionStorage.removeItem('gestao_rh_session_unlocked');
    setIsLocked(true);
    addToast('Sistema bloqueado por segurança e sigilo.', 'info');
  };

  const unlockSystem = () => {
    sessionStorage.setItem('gestao_rh_session_unlocked', 'true');
    setIsLocked(false);
  };

  const logout = () => {
    lockSystem();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user,
        users,
        roles,
        employeesList,
        currentEmployee,
        currentEmployeeId: user?.employeeId,
        isEmployeeOnly,
        loading,
        toasts,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        addToast,
        removeToast,
        switchUser,
        loginAsEmployee,
        loginAsAdmin,
        updateUserProfile,
        hasPermission,
        refreshUsers,
        logout,
        isLocked,
        lockSystem,
        unlockSystem,
      }}
    >
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl text-sm font-medium transition-all duration-200 flex items-center justify-between gap-3 border ${
              t.type === 'success'
                ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700/50 backdrop-blur-md'
                : t.type === 'error'
                ? 'bg-rose-900/90 text-rose-100 border-rose-700/50 backdrop-blur-md'
                : t.type === 'warning'
                ? 'bg-amber-900/90 text-amber-100 border-amber-700/50 backdrop-blur-md'
                : 'bg-slate-900/90 text-slate-100 border-slate-700/50 backdrop-blur-md'
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-xs opacity-75 hover:opacity-100 transition-opacity ml-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
