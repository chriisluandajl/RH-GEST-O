import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanySettings, VisualSettings } from '../types/index.ts';
import { api } from '../services/api.ts';

import { initialCompanySettings, initialVisualSettings } from '../../server/initialData.ts';

interface CompanyContextType {
  company: CompanySettings;
  visual: VisualSettings;
  loading: boolean;
  updateCompany: (data: Partial<CompanySettings>) => Promise<void>;
  updateVisual: (data: Partial<VisualSettings>) => Promise<void>;
  refreshCompanyData: () => Promise<void>;
}

const STORAGE_KEY_COMPANY = 'gestao_rh_company_settings';
const STORAGE_KEY_VISUAL = 'gestao_rh_visual_settings';

export const normalizeCompanyData = (c: Partial<CompanySettings>): CompanySettings => {
  const compName = c.companyName || 'GESTÃO EMPRESARIAL RH';
  const commName = c.commercialName || c.tradingName || 'Grupo Empresarial Delta & Associados, Lda.';
  const repName = c.responsibleName || c.legalRepresentative || 'Dr. António Manuel de Sousa';
  const repRole = c.responsiblePosition || c.legalRepresentativeRole || 'Diretor Geral de Recursos Humanos';
  const ph = c.phone || c.phone1 || '+244 923 456 789 / +244 222 345 678';

  return {
    companyName: compName,
    commercialName: commName,
    tradingName: commName,
    nif: c.nif || '5412984102',
    commercialRegistryNumber: c.commercialRegistryNumber || 'REG-2021-9874',
    address: c.address || 'Avenida 4 de Fevereiro, Edifício Atlântico Tower, 8º Andar',
    municipality: c.municipality || 'Luanda',
    province: c.province || 'Luanda',
    country: c.country || 'Angola',
    postalCode: c.postalCode || '1000',
    phone: ph,
    phone1: c.phone1 || ph,
    phone2: c.phone2 || '+244 222 345 678',
    email: c.email || 'geral@delta-empresarial.com',
    website: c.website || 'https://www.delta-empresarial.com',
    logoUrl: c.logoUrl || '/company_logo.jpg',
    responsibleName: repName,
    responsiblePosition: repRole,
    legalRepresentative: repName,
    legalRepresentativeRole: repRole,
    bankName: c.bankName || 'Banco Angolano de Investimentos (BAI)',
    iban: c.iban || 'AO06004000001428590123101',
  };
};

const getStoredCompany = (): CompanySettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPANY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeCompanyData(parsed);
    }
  } catch (e) {
    console.warn('Could not read cached company settings', e);
  }
  return normalizeCompanyData(initialCompanySettings);
};

const getStoredVisual = (): VisualSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISUAL);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...initialVisualSettings, ...parsed };
    }
  } catch (e) {
    console.warn('Could not read cached visual settings', e);
  }
  return initialVisualSettings;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanySettings>(getStoredCompany);
  const [visual, setVisual] = useState<VisualSettings>(getStoredVisual);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [compData, visData] = await Promise.all([
        api.getCompanySettings(),
        api.getVisualSettings(),
      ]);
      if (compData) {
        const normalized = normalizeCompanyData(compData);
        setCompany(normalized);
        localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(normalized));
      }
      if (visData) {
        const merged = { ...initialVisualSettings, ...visData };
        setVisual(merged);
        localStorage.setItem(STORAGE_KEY_VISUAL, JSON.stringify(merged));
      }
    } catch (err) {
      console.warn('Using cached company & visual settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateCompany = async (data: Partial<CompanySettings>) => {
    const merged = normalizeCompanyData({ ...company, ...data });
    setCompany(merged);
    localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(merged));

    try {
      const updated = await api.updateCompanySettings(merged);
      if (updated) {
        const normalized = normalizeCompanyData(updated);
        setCompany(normalized);
        localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(normalized));
      }
    } catch (err) {
      console.warn('Saved company settings locally in cache (backend offline/delayed):', err);
    }
  };

  const updateVisual = async (data: Partial<VisualSettings>) => {
    const merged = { ...visual, ...data };
    setVisual(merged);
    localStorage.setItem(STORAGE_KEY_VISUAL, JSON.stringify(merged));

    try {
      const updated = await api.updateVisualSettings(merged);
      if (updated) {
        setVisual(updated);
        localStorage.setItem(STORAGE_KEY_VISUAL, JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Saved visual settings locally in cache:', err);
    }
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
