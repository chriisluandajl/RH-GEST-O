import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Startup connection verification
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore connection verified successfully');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Verify network connection and configuration.');
    } else {
      console.log('Firestore initialized with project:', firebaseConfig.projectId);
    }
    return false;
  }
}

export { firebaseConfig };

// Cloud Backup and Sync Functions
export async function backupAllToFirestore(dataPayload: Record<string, any>): Promise<{ success: boolean; message: string }> {
  try {
    const backupDocRef = doc(db, 'system_backups', 'latest_snapshot');
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(backupDocRef, {
        updatedAt: new Date().toISOString(),
        projectId: firebaseConfig.projectId,
        companySettings: dataPayload.companySettings || null,
        visualSettings: dataPayload.visualSettings || null,
        counts: {
          employees: dataPayload.employees?.length || 0,
          contracts: dataPayload.contracts?.length || 0,
          documents: dataPayload.documents?.length || 0,
          vacations: dataPayload.vacations?.length || 0,
          payrollSheets: dataPayload.payrollSheets?.length || 0,
        },
        payloadJson: JSON.stringify(dataPayload),
      }, { merge: true })
    );

    return {
      success: true,
      message: `Cópia de segurança guardada com sucesso no Firestore do projeto ${firebaseConfig.projectId}.`,
    };
  } catch (err: any) {
    console.warn('Erro ao guardar backup no Firestore:', err);
    return {
      success: false,
      message: err.message || 'Falha ao sincronizar com o Firestore.',
    };
  }
}

export async function restoreAllFromFirestore(): Promise<{ success: boolean; data?: any; message: string }> {
  try {
    const backupDocRef = doc(db, 'system_backups', 'latest_snapshot');
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(backupDocRef);
    if (!snap.exists()) {
      return {
        success: false,
        message: 'Nenhuma cópia de segurança encontrada no Firebase Firestore.',
      };
    }
    const snapData = snap.data();
    if (snapData.payloadJson) {
      const parsed = JSON.parse(snapData.payloadJson);
      return {
        success: true,
        data: parsed,
        message: `Dados restaurados com sucesso do Firestore (gravados em ${snapData.updatedAt}).`,
      };
    }
    return {
      success: true,
      data: snapData,
      message: 'Dados restaurados com sucesso do Firebase.',
    };
  } catch (err: any) {
    console.warn('Erro ao restaurar do Firestore:', err);
    return {
      success: false,
      message: err.message || 'Falha ao descarregar do Firestore.',
    };
  }
}
