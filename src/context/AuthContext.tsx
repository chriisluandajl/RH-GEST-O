import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RolePermissions, PermissionSet, Employee } from '../types/index.ts';
import { api } from '../services/api.ts';

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
  loginAsEmployee: (identifier: string) => Promise<void>;
  loginAsAdmin: (email: string, password?: string) => Promise<void>;
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
    try {
      const [usersData, rolesData, empData] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getEmployees(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setEmployeesList(empData || []);

      const savedUserId = localStorage.getItem('gestao_rh_user_id') || usersData[0]?.id;
      const found = usersData.find((u) => u.id === savedUserId) || usersData[0] || null;
      setUser(found);
      if (found) {
        localStorage.setItem('gestao_rh_user_id', found.id);
        if (found.employeeId) {
          const emp = (empData || []).find((e) => e.id === found.employeeId);
          setCurrentEmployee(emp || null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load auth users:', err);
    } finally {
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

  const loginAsEmployee = async (identifier: string) => {
    try {
      const res = await api.employeeLogin(identifier);
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('gestao_rh_user_id', res.user.id);
        sessionStorage.setItem('gestao_rh_session_unlocked', 'true');
        setIsLocked(false);
        setIsLoginModalOpen(false);
        if (res.employee) {
          setCurrentEmployee(res.employee);
        }
        addToast(`Acesso desbloqueado: ${res.user.name} (Portal do Colaborador)`, 'success');
        refreshUsers();
      }
    } catch (err: any) {
      console.error('Employee login failed:', err);
      throw err;
    }
  };

  const loginAsAdmin = async (emailOrCode: string, password?: string) => {
    try {
      const res = await api.login(emailOrCode, password);
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('gestao_rh_user_id', res.user.id);
        sessionStorage.setItem('gestao_rh_session_unlocked', 'true');
        setIsLocked(false);
        setIsLoginModalOpen(false);
        addToast(`Sessão administrativa autorizada: ${res.user.name} (${res.user.role})`, 'success');
        refreshUsers();
      }
    } catch (err: any) {
      console.error('Admin login failed:', err);
      throw err;
    }
  };

  const isEmployeeOnly = Boolean(
    user?.role === 'UTILIZADOR' || user?.isEmployeeOnly || user?.employeeId
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
      if (user) {
        const updated = usersData.find((u) => u.id === user.id);
        if (updated) setUser(updated);
      }
    } catch (err) {
      console.error(err);
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
