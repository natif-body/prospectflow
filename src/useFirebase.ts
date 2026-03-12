import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, query, where, getDocs, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Client, Formula, Relance, ManualStats, DailyLog, DashboardStats } from './types';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

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
  const [user, setUser] = useState(auth.currentUser);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [relances, setRelances] = useState<Relance[]>([]);
  const [manualStats, setManualStats] = useState<ManualStats[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Test connection
        getDocFromServer(doc(db, 'test', 'connection')).catch(error => {
          if(error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        });
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    setLoading(true);
    const uid = user.uid;

    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('uid', '==', uid)), (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    const unsubFormulas = onSnapshot(query(collection(db, 'formulas'), where('uid', '==', uid)), (snapshot) => {
      setFormulas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'formulas'));

    const unsubRelances = onSnapshot(query(collection(db, 'relances'), where('uid', '==', uid)), (snapshot) => {
      setRelances(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'relances'));

    const unsubManualStats = onSnapshot(query(collection(db, 'manualStats'), where('uid', '==', uid)), (snapshot) => {
      setManualStats(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'manualStats'));

    const unsubDailyLogs = onSnapshot(query(collection(db, 'dailyLogs'), where('uid', '==', uid)), (snapshot) => {
      setDailyLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'dailyLogs'));

    return () => {
      unsubClients();
      unsubFormulas();
      unsubRelances();
      unsubManualStats();
      unsubDailyLogs();
    };
  }, [isAuthReady, user]);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  return {
    user,
    isAuthReady,
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
