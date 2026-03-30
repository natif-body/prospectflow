import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, query, where, getDocs, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Client, Formula, Relance, ManualStats, DailyLog, DashboardStats } from './types';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';

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
  authInfo: any;
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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirebase() {
  const [user, setUser] = useState<any>(null); // Keep for compatibility but we won't strictly need it
  const [isAuthReady, setIsAuthReady] = useState(true); // Always ready now
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [relances, setRelances] = useState<Relance[]>([]);
  const [manualStats, setManualStats] = useState<ManualStats[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  // We no longer need auth state changes to load data, but we'll keep the test connection
  useEffect(() => {
    // Test connection
    getDocFromServer(doc(db, 'test', 'connection')).catch(error => {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    // We use a hardcoded UID or just query all since the rules allow it.
    // To keep data isolated if you ever want to, we'll use a default 'admin' uid.
    const uid = 'admin_user';

    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setClients(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    const unsubFormulas = onSnapshot(query(collection(db, 'formulas'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setFormulas(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'formulas'));

    const unsubRelances = onSnapshot(query(collection(db, 'relances'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
      setRelances(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'relances'));

    const unsubManualStats = onSnapshot(query(collection(db, 'manualStats'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.period_start || 0).getTime() - new Date(a.period_start || 0).getTime());
      setManualStats(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'manualStats'));

    const unsubDailyLogs = onSnapshot(query(collection(db, 'dailyLogs'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setDailyLogs(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'dailyLogs'));

    return () => {
      unsubClients();
      unsubFormulas();
      unsubRelances();
      unsubManualStats();
      unsubDailyLogs();
    };
  }, []);

  // Mock login/logout so we don't break the UI
  const login = async () => {};
  const logout = async () => {};

  return {
    user,
    isAuthReady,
    authError,
    loading,
    clients,
    formulas,
    relances,
    manualStats,
    dailyLogs,
    login,
    logout
  };
}
