import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanySettings, VisualSettings } from '../types/index.ts';
import { api } from '../services/api.ts';

interface CompanyContextType {
  company: CompanySettings;
  visual: VisualSettings;
  loading: boolean;
  updateCompany: (data: Partial<CompanySettings>) => Promise<void>;
  updateVisual: (data: Partial<VisualSettings>) => Promise<void>;
  refreshCompanyData: () => Promise<void>;
}

const defaultCompany: CompanySettings = {
  companyName: 'LUSO TECH & SERVIÇOS EMPRESARIAIS, LDA',
  commercialName: 'LUSO TECH SOLUTIONS',
  nif: '5417892301',
  commercialRegistryNumber: 'REG-2021-9874',
  legalRepresentative: 'Dr. Carlos Alberto Ferreira',
  legalRepresentativeRole: 'Director Geral',
  address: 'Avenida 4 de Fevereiro, Edifício Luanda Ocean Tower, 8º Andar',
  municipality: 'Luanda',
  province: 'Luanda',
  country: 'Angola',
  postalCode: '1000',
  phone1: '+244 923 456 789',
  phone2: '+244 222 345 678',
  email: 'geral@lusotech.co.ao',
  website: 'www.lusotech.co.ao',
  bankName: 'Banco Angolano de Investimentos (BAI)',
  iban: 'AO06004000001234567890123',
};

const defaultVisual: VisualSettings = {
  systemTitle: 'Gestão Empresarial RH',
  systemSubtitle: 'Sistema Integrado de Contratos e Recursos Humanos',
  primaryColor: '#1e3a8a',
  sidebarTheme: 'DARK',
  dateFormat: 'DD/MM/YYYY',
  currencySymbol: 'Kz',
  alertNoticeDays: 30,
  documentAlertNoticeDays: 15,
  compactView: false,
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanySettings>(defaultCompany);
  const [visual, setVisual] = useState<VisualSettings>(defaultVisual);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [compData, visData] = await Promise.all([
        api.getCompanySettings(),
        api.getVisualSettings(),
      ]);
      if (compData) setCompany(compData);
      if (visData) setVisual(visData);
    } catch (err) {
      console.error('Failed to load company and visual settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateCompany = async (data: Partial<CompanySettings>) => {
    const updated = await api.updateCompanySettings(data);
    setCompany(updated);
  };

  const updateVisual = async (data: Partial<VisualSettings>) => {
    const updated = await api.updateVisualSettings(data);
    setVisual(updated);
  };

  const refreshCompanyData = async () => {
    await loadData();
  };

  return (
    <CompanyContext.Provider
      value={{
        company,
        visual,
        loading,
        updateCompany,
        updateVisual,
        refreshCompanyData,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompany must be used within a CompanyProvider');
  return context;
};
