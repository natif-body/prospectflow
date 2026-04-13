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
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [relances, setRelances] = useState<Relance[]>([]);
  const [manualStats, setManualStats] = useState<ManualStats[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    setLoading(true);
    // Force admin_user to ensure all original data is visible, 
    // even if the user got an anonymous session previously.
    const uid = 'admin_user';

    const fallbackTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const handleListError = (error: any, path: string) => {
      console.error(`Error loading ${path}:`, error);
      setAuthError(error.message);
      setLoading(false);
    };

    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setClients(data);
    }, (error) => handleListError(error, 'clients'));

    const unsubFormulas = onSnapshot(query(collection(db, 'formulas'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setFormulas(data);
    }, (error) => handleListError(error, 'formulas'));

    const unsubRelances = onSnapshot(query(collection(db, 'relances'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
      setRelances(data);
    }, (error) => handleListError(error, 'relances'));

    const unsubManualStats = onSnapshot(query(collection(db, 'manualStats'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.period_start || 0).getTime() - new Date(a.period_start || 0).getTime());
      setManualStats(data);
    }, (error) => handleListError(error, 'manualStats'));

    const unsubDailyLogs = onSnapshot(query(collection(db, 'dailyLogs'), where('uid', '==', uid)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setDailyLogs(data);
      setLoading(false);
      clearTimeout(fallbackTimeout);
    }, (error) => handleListError(error, 'dailyLogs'));

    return () => {
      clearTimeout(fallbackTimeout);
      unsubClients();
      unsubFormulas();
      unsubRelances();
      unsubManualStats();
      unsubDailyLogs();
    };
  }, [isAuthReady, user]);

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
