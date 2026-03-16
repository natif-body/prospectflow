import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  UserPlus, 
  Search,
  MoreHorizontal,
  ArrowUpRight,
  ChevronRight,
  Filter,
  LayoutDashboard,
  UserCheck,
  Ban,
  FileText,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Share2,
  MessageSquare,
  Plus,
  X,
  Download,
  Save,
  Edit2,
  Check,
  Phone,
  Mail
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'motion/react';
import Papa from 'papaparse';
import { cn } from './lib/utils';
import { 
  Client, 
  DashboardStats, 
  AttendanceStatus, 
  SignatureStatus, 
  AppointmentSource,
  Formula,
  ManualStats,
  DailyLog,
  Relance
} from './types';

import { useFirebase, OperationType, handleFirestoreError } from './useFirebase';
import { useStats } from './useStats';
import { db, auth } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';

// --- Components ---

export default function App() {
  // --- Sub-components ---
  const StatCard = ({ title, value, subValue, icon: Icon, trend, color }: any) => (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className={cn("p-2 rounded-xl", color)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1 font-medium">{subValue}</p>}
      </div>
    </div>
  );

  const formatPrice = (priceTTC: number) => {
    const priceHT = priceTTC / 1.2;
    return {
      ttc: `${priceTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ TTC`,
      ht: `${priceHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ HT`
    };
  };

  const AttendanceChart = ({ data, title, colors }: { data: any[], title: string, colors: string[] }) => {
    if (!data || data.length === 0) return <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Pas de données</div>;
    return (
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const DailyHistogram = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">Pas de données</div>;
    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(str) => {
                try {
                  return format(new Date(str), 'dd MMM', { locale: fr });
                } catch (e) {
                  return str;
                }
              }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="prospects" name="Prospects" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="signatures" name="Signatures" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const handleDeleteFormula = async (id: string) => {
    showConfirm('Supprimer la formule', 'Êtes-vous sûr de vouloir supprimer cette formule ?', async () => {
      try {
        await deleteDoc(doc(db, 'formulas', id.toString()));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `formulas/${id}`);
      }
    });
  };

  const generateWeeks = () => {
    const weeks = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Generate for current and previous year
    for (let year = currentYear; year >= currentYear - 1; year--) {
      for (let week = 52; week >= 1; week--) {
        const d = new Date(year, 0, 1 + (week - 1) * 7);
        const day = d.getDay();
        const ISOweekStart = new Date(d);
        if (day <= 4) ISOweekStart.setDate(d.getDate() - d.getDay() + 1);
        else ISOweekStart.setDate(d.getDate() + 8 - d.getDay());
        
        const dateStr = ISOweekStart.toISOString().split('T')[0];
        const label = `Semaine ${week} (${format(ISOweekStart, 'dd MMM', { locale: fr })} - ${year})`;
        weeks.push({ value: dateStr, label });
      }
    }
    return weeks;
  };

  const { user, isAuthReady, loading, clients, formulas, relances, manualStats, dailyLogs, login, logout } = useFirebase();
  
  // Date Range
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const stats = useStats(clients, formulas, manualStats, dateRange.startDate, dateRange.endDate);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'relances' | 'settings'>('dashboard');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReportingModalOpen, setIsReportingModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'client' | 'membre'>('all');
  const [formulaPeriodFilter, setFormulaPeriodFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [specificFormulaFilter, setSpecificFormulaFilter] = useState<string>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingSetter, setIsImportingSetter] = useState(false);

  
  // Reporting state
  const [reportRange, setReportRange] = useState<'day' | 'week' | 'month' | 'all'>('day');
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([]);
  const [newWhatsappNumber, setNewWhatsappNumber] = useState('');
  const [selectedWhatsapp, setSelectedWhatsapp] = useState('');
  const [filteredStats, setFilteredStats] = useState<any>(null);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  
  // Formulas
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [formulaToEdit, setFormulaToEdit] = useState<Formula | null>(null);
  const [newFormula, setNewFormula] = useState<{ name: string; price: number; period: 'week' | 'month' | 'year'; almaCommission?: number }>({ 
    name: '', 
    price: 0, 
    period: 'month',
    almaCommission: 0
  });
  
  // Manual Stats
  const [isManualStatsModalOpen, setIsManualStatsModalOpen] = useState(false);
  const [isDailyLogModalOpen, setIsDailyLogModalOpen] = useState(false);
  const [editingManualStats, setEditingManualStats] = useState<ManualStats | null>(null);
  const [editingDailyLog, setEditingDailyLog] = useState<DailyLog | null>(null);
  const [isImportSelectionModalOpen, setIsImportSelectionModalOpen] = useState(false);
  const [isRelanceModalOpen, setIsRelanceModalOpen] = useState(false);
  const [relanceFormData, setRelanceFormData] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    notes: '',
    targetDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [hasDismissedReminders, setHasDismissedReminders] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleDeleteManualStats = async (id: string) => {
    showConfirm('Supprimer la saisie', 'Êtes-vous sûr de vouloir supprimer cette saisie ?', async () => {
      try {
        await deleteDoc(doc(db, 'manualStats', id.toString()));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `manualStats/${id}`);
      }
    });
  };

  const seedDefaultFormulas = async () => {
    if (!user) return;
    const defaults = [
      { name: 'Hebdomadaire Basique', price: 30, period: 'week', uid: user.uid },
      { name: 'Hebdomadaire Classique', price: 50, period: 'week', uid: user.uid },
      { name: 'Hebdomadaire Premium', price: 80, period: 'week', uid: user.uid },
      { name: 'Mensuel Basique', price: 100, period: 'month', uid: user.uid },
      { name: 'Mensuel Classique', price: 150, period: 'month', uid: user.uid },
      { name: 'Mensuel Premium', price: 250, period: 'month', uid: user.uid },
      { name: 'Annuel Basique', price: 1000, period: 'year', uid: user.uid },
      { name: 'Annuel Classique', price: 1500, period: 'year', uid: user.uid },
      { name: 'Annuel Premium', price: 2500, period: 'year', uid: user.uid }
    ];
    
    try {
      const batch = writeBatch(db);
      defaults.forEach(f => {
        const docRef = doc(collection(db, 'formulas'));
        batch.set(docRef, f);
      });
      await batch.commit();
      showToast('Formules par défaut ajoutées', 'success');
    } catch (error) {
      console.error("Error seeding formulas:", error);
      showToast("Erreur lors de l'ajout des formules", 'error');
    }
  };

  const handleDailyLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDailyLog || !user) return;

    try {
      if (editingDailyLog.id) {
        const updates = { ...editingDailyLog };
        delete (updates as any).id;
        await updateDoc(doc(db, 'dailyLogs', editingDailyLog.id.toString()), updates);
      } else {
        await addDoc(collection(db, 'dailyLogs'), {
          ...editingDailyLog,
          uid: user.uid
        });
      }
      setIsDailyLogModalOpen(false);
      setEditingDailyLog(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'dailyLogs');
    }
  };

  const handleRelanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relanceFormData.name || !relanceFormData.targetDate || !user) {
      console.error("Missing required fields or user not authenticated");
      return;
    }

    try {
      const targetDate = new Date(relanceFormData.targetDate);
      const dayBefore = new Date(targetDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      // Remove targetDate from the data sent to Firestore to avoid rule issues
      const { targetDate: _, ...baseData } = relanceFormData;

      // Create J-1 reminder
      await addDoc(collection(db, 'relances'), {
        ...baseData,
        name: `${relanceFormData.name} (J-1)`,
        dueDate: dayBefore.toISOString(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        uid: user.uid
      });

      // Create Jour J reminder
      await addDoc(collection(db, 'relances'), {
        ...baseData,
        name: `${relanceFormData.name} (Jour J)`,
        dueDate: targetDate.toISOString(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        uid: user.uid
      });

      setIsRelanceModalOpen(false);
      setRelanceFormData({ 
        name: '', 
        phone: '', 
        email: '', 
        notes: '',
        targetDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Error creating relances:", error);
      handleFirestoreError(error, OperationType.CREATE, 'relances');
    }
  };

  const handleDeleteDailyLog = async (id: string) => {
    showConfirm('Supprimer la note', 'Êtes-vous sûr de vouloir supprimer cette note ?', async () => {
      try {
        await deleteDoc(doc(db, 'dailyLogs', id));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `dailyLogs/${id}`);
      }
    });
  };

  const calculateMonthlyRevenue = (price: number, period: 'week' | 'month' | 'year') => {
    if (period === 'week') return (price * 52) / 12;
    if (period === 'year') return price / 12;
    return price;
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRangePreset, setSelectedRangePreset] = useState('all');
  const [basketPeriod, setBasketPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // Form state
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    formulaId: undefined as string | undefined,
    createdAt: new Date().toISOString().split('T')[0]
  });

  const generateMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy', { locale: fr })
      });
    }
    return months;
  };

  const fetchData = async (startDate?: string, endDate?: string) => {
    // Data is now fetched via Firebase onSnapshot
  };

  useEffect(() => {
    fetchData(dateRange.startDate, dateRange.endDate);
    fetchSettings();
  }, [dateRange]);

  const fetchSettings = async () => {
    try {
      const data = localStorage.getItem('whatsapp_numbers');
      if (data) {
        const parsed = JSON.parse(data);
        setWhatsappNumbers(parsed);
        if (parsed.length > 0) setSelectedWhatsapp(parsed[0]);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const saveWhatsappNumbers = async (numbers: string[]) => {
    try {
      localStorage.setItem('whatsapp_numbers', JSON.stringify(numbers));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const fetchFilteredStats = async (range: string) => {
    setIsFetchingStats(true);
    try {
      let startDate = new Date();
      if (range === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (range === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (range === 'month') {
        startDate.setDate(1);
      } else {
        startDate = new Date(0);
      }
      
      const startStr = startDate.toISOString().split('T')[0];
      
      let total = 0;
      let appointments = 0;
      let showedUp = 0;
      let signed = 0;
      
      clients.forEach(c => {
        if (c.createdAt >= startStr) total++;
      });
      
      manualStats.forEach(m => {
        if (m.period_start >= startStr) {
          appointments += m.appointmentsTaken || 0;
          showedUp += m.showedUp || 0;
          signed += m.signed || 0;
        }
      });
      
      dailyLogs.forEach(d => {
        if (d.date >= startStr) {
          appointments += d.appointments || 0;
          showedUp += d.showedUp || 0;
          signed += d.signed || 0;
        }
      });

      setFilteredStats({
        range,
        total,
        appointments,
        showedUp,
        signed
      });
    } catch (error) {
      console.error("Error calculating filtered stats:", error);
    } finally {
      setIsFetchingStats(false);
    }
  };

  useEffect(() => {
    if (isReportingModalOpen) {
      fetchFilteredStats(reportRange);
    }
  }, [isReportingModalOpen, reportRange]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'clients'), {
        ...newClient,
        createdAt: new Date(newClient.createdAt).toISOString(),
        isActive: true,
        uid: user.uid
      });
      setIsClientModalOpen(false);
      setNewClient({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        phone: '', 
        birthDate: '',
        address: '',
        formulaId: undefined,
        createdAt: new Date().toISOString().split('T')[0] 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit || !user) return;
    
    const updates = { ...clientToEdit };
    delete (updates as any).id;
    try {
      await updateDoc(doc(db, 'clients', clientToEdit.id.toString()), updates);
      setIsEditModalOpen(false);
      setClientToEdit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${clientToEdit.id}`);
    }
  };

  const handleUpdateStatus = async (id: string, updates: Partial<Client>) => {
    try {
      await updateDoc(doc(db, 'clients', id.toString()), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await deleteDoc(doc(db, 'clients', clientToDelete.id.toString()));
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${clientToDelete.id}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const keys = results.data.length > 0 ? Object.keys(results.data[0]) : [];
          const findKey = (patterns: string[]) => keys.find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));

          const prospectsToImport = results.data.map((row: any) => {
            const fName = row[findKey(['firstName', 'prenom', 'prénom', 'Firstname']) || ''] || '';
            const lName = row[findKey(['lastName', 'nom', 'Lastname']) || ''] || '';
            
            return {
              firstName: String(fName).trim(),
              lastName: String(lName).trim(),
              email: row[findKey(['email', 'Email']) || ''] || '',
              createdAt: row[findKey(['createdAt', 'date', 'inscription']) || ''] || new Date().toISOString(),
              isActive: true,
              uid: user.uid
            };
          }).filter(p => p.firstName !== '');

          if (prospectsToImport.length > 0) {
            const batch = writeBatch(db);
            prospectsToImport.forEach(prospect => {
              const docRef = doc(collection(db, 'clients'));
              batch.set(docRef, prospect);
            });
            await batch.commit();
            showToast(`${prospectsToImport.length} prospects importés avec succès.`, 'success');
          }
        } catch (error) {
          console.error("Error importing prospects:", error);
          showToast("Erreur lors de l'importation des prospects", 'error');
        } finally {
          setIsImporting(false);
          if (e.target) e.target.value = '';
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        setIsImporting(false);
      }
    });
  };

  const handleClientFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const keys = results.data.length > 0 ? Object.keys(results.data[0]) : [];
          const findKey = (patterns: string[]) => keys.find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));

          const clientsToImport = results.data.map((row: any) => {
            let firstName = '';
            let lastName = '';
            
            const fullNameKey = findKey(['nom prénom', 'nom prenom', 'nom complet', 'full name']);
            if (fullNameKey && row[fullNameKey]) {
              const parts = String(row[fullNameKey]).trim().split(' ');
              firstName = parts[0] || '';
              lastName = parts.slice(1).join(' ') || '';
            } else {
              firstName = row[findKey(['firstName', 'prenom', 'prénom', 'Firstname']) || ''] || '';
              lastName = row[findKey(['lastName', 'nom', 'Lastname']) || ''] || '';
            }

            // Detect status
            let isActive = true;
            const statusKey = findKey(['statut', 'état', 'actif', 'résilié', 'contrat', 'status']);
            
            if (statusKey) {
              const statusVal = String(row[statusKey]).toLowerCase();
              if (statusVal.includes('résilié') || 
                  statusVal.includes('inactif') || 
                  statusVal.includes('terminé') || 
                  statusVal.includes('fin') ||
                  statusVal === '0' ||
                  statusVal === 'false') {
                isActive = false;
              }
            }

            return {
              firstName: String(firstName).trim() || 'Inconnu',
              lastName: String(lastName).trim(),
              email: row[findKey(['email', 'Email', 'Adresse e-mail']) || ''] || '',
              phone: row[findKey(['phone', 'téléphone', 'Téléphone', 'Mobile', 'Tel']) || ''] || '',
              birthDate: row[findKey(['birthDate', 'naissance', 'Date de naissance']) || ''] || '',
              address: row[findKey(['address', 'adresse', 'Adresse postale', 'Rue']) || ''] || '',
              createdAt: row[findKey(['createdAt', 'inscription', 'Date d\'inscription', 'Adhésion']) || ''] || new Date().toISOString(),
              isActive,
              uid: user.uid
            };
          }).filter(c => c.firstName !== 'Inconnu' || c.lastName !== '');

          if (clientsToImport.length > 0) {
            // Split into chunks of 500 for Firestore batch limits
            const chunkSize = 500;
            for (let i = 0; i < clientsToImport.length; i += chunkSize) {
              const chunk = clientsToImport.slice(i, i + chunkSize);
              const batch = writeBatch(db);
              chunk.forEach(client => {
                const docRef = doc(collection(db, 'clients'));
                batch.set(docRef, client);
              });
              await batch.commit();
            }
            showToast(`${clientsToImport.length} clients importés avec succès.`, 'success');
          }
        } catch (error) {
          console.error("Error importing clients:", error);
          showToast("Erreur lors de l'importation des clients", 'error');
        } finally {
          setIsImporting(false);
          if (e.target) e.target.value = '';
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        setIsImporting(false);
      }
    });
  };



  const handleSetterImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingSetter(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          for (const row of data) {
            const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date'));
            const callsKey = Object.keys(row).find(k => k.toLowerCase().includes('appel') || k.toLowerCase().includes('call') || k.toLowerCase().includes('setter'));
            const pickupsKey = Object.keys(row).find(k => k.toLowerCase().includes('décroché') || k.toLowerCase().includes('decroche') || k.toLowerCase().includes('pickup'));

            const date = dateKey ? row[dateKey] : null;
            const calls = callsKey ? parseInt(row[callsKey]) || 0 : 0;
            const pickups = pickupsKey ? parseInt(row[pickupsKey]) || 0 : 0;

            if (date && user) {
              await addDoc(collection(db, 'manualStats'), {
                period_start: date,
                period_type: 'day',
                totalContacts: 0, // Required field
                totalCalls: calls,
                totalPickups: pickups,
                uid: user.uid
              });
            }
          }
          await fetchData(dateRange.startDate, dateRange.endDate);
          showToast('Import Reporting Setter réussi', 'success');
        } catch (error) {
          console.error("Error importing Setter data:", error);
          showToast('Erreur lors de l\'importation du reporting setter', 'error');
        } finally {
          setIsImportingSetter(false);
          if (e.target) e.target.value = '';
        }
      }
    });
  };

  const handleAddWhatsapp = () => {
    if (!newWhatsappNumber) return;
    const updated = [...whatsappNumbers, newWhatsappNumber];
    setWhatsappNumbers(updated);
    saveWhatsappNumbers(updated);
    if (!selectedWhatsapp) setSelectedWhatsapp(newWhatsappNumber);
    setNewWhatsappNumber('');
  };

  const handleRemoveWhatsapp = (num: string) => {
    const updated = whatsappNumbers.filter(n => n !== num);
    setWhatsappNumbers(updated);
    saveWhatsappNumbers(updated);
    if (selectedWhatsapp === num) setSelectedWhatsapp(updated[0] || '');
  };

  const generateReportText = () => {
    if (!filteredStats) return '';
    const rangeLabel = 
      reportRange === 'day' ? "du jour" :
      reportRange === 'week' ? "de la semaine" :
      reportRange === 'month' ? "du mois" : "complets";

    return `📊 *REPORTING PROSPECTFLOW* (${rangeLabel})\n\n` +
           `📅 Date : ${format(new Date(), 'dd/MM/yyyy')}\n\n` +
           `👥 Nouveaux Prospects : ${filteredStats.total}\n` +
           `📅 RDV Pris : ${filteredStats.appointments}\n` +
           `✅ Venus : ${filteredStats.showedUp}\n` +
           `✍️ Signés : ${filteredStats.signed}\n\n` +
           `🚀 Propulsé par ProspectFlow`;
  };

  const handleSendWhatsapp = () => {
    if (!selectedWhatsapp || !filteredStats) return;
    const text = encodeURIComponent(generateReportText());
    const cleanNumber = selectedWhatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  const filteredClients = clients.filter(p => {
    const matchesSearch = `${p.firstName} ${p.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = clientTypeFilter === 'all' || 
      (clientTypeFilter === 'membre' && p.formulaId) || 
      (clientTypeFilter === 'client' && !p.formulaId);

    const formula = formulas.find(f => f.id.toString() === p.formulaId?.toString());
    const matchesPeriod = formulaPeriodFilter === 'all' || 
      (formula && formula.period === formulaPeriodFilter);

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && p.isActive) || 
      (statusFilter === 'inactive' && !p.isActive);

    const matchesSpecificFormula = specificFormulaFilter === 'all' || 
      p.formulaId?.toString() === specificFormulaFilter;

    return matchesSearch && matchesType && matchesPeriod && matchesStatus && matchesSpecificFormula;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const reminders = React.useMemo(() => {
    const list: { id: string, name: string, date: Date, text: string, isOverdue: boolean, isToday: boolean }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    relances.forEach(r => {
      if (r.status === 'PENDING') {
        const d = new Date(r.dueDate);
        d.setHours(0, 0, 0, 0);
        const isToday = d.getTime() === now.getTime();
        const isOverdue = d.getTime() < now.getTime();
        list.push({ id: `relance-${r.id}`, name: r.name, date: d, text: format(d, 'dd/MM'), isOverdue, isToday });

        // Also scan notes for other dates
        if (r.notes) {
          const dateRegex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/g;
          let match;
          while ((match = dateRegex.exec(r.notes)) !== null) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const year = match[3] ? (match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3])) : now.getFullYear();
            const d2 = new Date(year, month, day);
            if (!isNaN(d2.getTime())) {
              const isToday2 = d2.getTime() === now.getTime();
              const isOverdue2 = d2.getTime() < now.getTime();
              list.push({ id: `relance-note-${r.id}-${match.index}`, name: r.name, date: d2, text: match[0], isOverdue: isOverdue2, isToday: isToday2 });
            }
          }
        }
      }
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [relances]);

  const attendanceData = (stats && stats.attendance) ? [
    { name: 'Venus', value: stats.attendance.showedUp },
    { name: 'Non-venus', value: stats.attendance.noShow },
    { name: 'Annulés', value: stats.attendance.cancelled },
  ].filter(d => d.value > 0) : [];

  const sourceData = (stats && stats.appointmentSources) ? [
    { name: 'Prospect', value: stats.appointmentSources.prospect },
    { name: 'Setter', value: stats.appointmentSources.setter },
  ].filter(d => d.value > 0) : [];

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // L'authentification est désormais automatique (anonyme)
  // Si l'utilisateur n'est pas trouvé, c'est probablement que l'authentification anonyme n'est pas activée
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-200">
            <X className="w-10 h-10 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Authentification requise</h1>
            <p className="text-slate-500 mt-2">
              Pour utiliser l'application sans écran de connexion, vous devez activer l'authentification <strong>Anonyme</strong> dans votre console Firebase.
            </p>
          </div>
          <button 
            onClick={login}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
          >
            <ArrowUpRight className="w-5 h-5" />
            Se connecter avec Google en attendant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">ProspectFlow</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'dashboard' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tableau de bord
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'clients' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Users className="w-4 h-4" />
            Base Membres
          </button>
          <button
            onClick={() => setActiveTab('relances')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'relances' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Clock className="w-4 h-4" />
            Relances
            {relances.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-auto bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs font-bold">
                {relances.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'settings' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter className="w-4 h-4" />
            Paramètres
          </button>

          {/* Reminders Section */}
          <div className="mt-8 px-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Rappels à faire</h4>
            <div className="space-y-2">
              {reminders.filter(r => r.isToday || r.isOverdue).slice(0, 5).map(r => (
                <div key={r.id} className="flex flex-col gap-0.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-900 truncate max-w-[100px]">{r.name}</span>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded",
                      r.isToday ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {r.text}
                    </span>
                  </div>
                </div>
              ))}
              {reminders.filter(r => r.isToday || r.isOverdue).length === 0 && (
                <p className="text-[10px] text-slate-400 italic">Aucun rappel urgent</p>
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 mt-auto space-y-4">
          <button 
            onClick={() => setIsReportingModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-semibold hover:bg-indigo-100 transition-all border border-indigo-100"
          >
            <Share2 className="w-4 h-4" />
            Envoyer Reporting
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-sm md:text-lg font-semibold text-slate-800 truncate max-w-[120px] md:max-w-none">
              {activeTab === 'dashboard' ? 'Tableau de bord' : 
               activeTab === 'clients' ? 'Base Membres' : 
               activeTab === 'relances' ? 'Relances' : 'Paramètres'}
            </h2>
            {activeTab === 'dashboard' && (
              <div className="flex items-center gap-1 md:gap-2 bg-slate-100 p-1 rounded-xl ml-2 md:ml-4 overflow-x-auto no-scrollbar">
                {[
                  { id: 'today', label: "Auj." },
                  { id: 'yesterday', label: 'Hier' },
                  { id: '7d', label: '7j' },
                  { id: '30d', label: '30j' },
                  { id: 'all', label: 'Tout' },
                  { id: 'custom', label: 'Perso' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedRangePreset(p.id);
                      if (p.id === 'custom') {
                        setShowDatePicker(true);
                      } else {
                        const now = new Date();
                        let start = '';
                        let end = now.toISOString().split('T')[0];
                        
                        if (p.id === 'today') {
                          start = end;
                        } else if (p.id === 'yesterday') {
                          const yest = new Date();
                          yest.setDate(yest.getDate() - 1);
                          start = yest.toISOString().split('T')[0];
                          end = start;
                        } else if (p.id === '7d') {
                          const week = new Date();
                          week.setDate(week.getDate() - 7);
                          start = week.toISOString().split('T')[0];
                        } else if (p.id === '30d') {
                          const month = new Date();
                          month.setDate(month.getDate() - 30);
                          start = month.toISOString().split('T')[0];
                        }

                        setDateRange({ startDate: start, endDate: start ? end : '' });
                      }
                    }}
                    className={cn(
                      "px-2 md:px-3 py-1 rounded-lg text-[10px] md:text-xs font-medium transition-all whitespace-nowrap",
                      selectedRangePreset === p.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {showDatePicker && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                <input 
                  type="date" 
                  className="text-xs border-none focus:ring-0 p-1"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="date" 
                  className="text-xs border-none focus:ring-0 p-1"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
                <button 
                  onClick={() => setShowDatePicker(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            )}
            <button 
              onClick={() => {
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                setEditingDailyLog({
                  date: dateStr,
                  appointments: 0,
                  showedUp: 0,
                  signed: 0,
                  notSigned: 0,
                  pending: 0,
                  noShow: 0,
                  digital: 0,
                  nonDigital: 0
                });
                setIsDailyLogModalOpen(true);
              }}
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Bloc-notes
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                setEditingManualStats({
                  period_start: dateStr,
                  period_type: 'day',
                  totalContacts: 0,
                  contactsDigital: 0,
                  contactsNonDigital: 0,
                  appointmentsTaken: 0,
                  appointmentsProspect: 0,
                  appointmentsSetter: 0,
                  showedUp: 0,
                  noShow: 0,
                  cancelled: 0,
                  signed: 0,
                  notSigned: 0,
                  totalCalls: 0,
                  totalPickups: 0,
                  notes: ''
                });
                setIsManualStatsModalOpen(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Saisie Chiffres
            </button>
            <button 
              onClick={() => setIsClientModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm shadow-indigo-200"
            >
              <UserPlus className="w-4 h-4" />
              Nouveau Membre
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {reminders.some(r => r.isToday) && !hasDismissedReminders && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Rappels du jour</h4>
                  <p className="text-xs text-amber-700">Vous avez {reminders.filter(r => r.isToday).length} rappel(s) à effectuer aujourd'hui.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('relances')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors"
                >
                  Voir les relances
                </button>
                <button 
                  onClick={() => setHasDismissedReminders(true)}
                  className="p-2 hover:bg-amber-100 rounded-xl text-amber-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6 md:space-y-8">
              {formulas.length === 0 && !loading && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-indigo-900">Aucune formule configurée</h4>
                      <p className="text-xs text-indigo-700">Souhaitez-vous ajouter les formules de base (Hebdomadaire, Mensuel, Annuel) ?</p>
                    </div>
                  </div>
                  <button 
                    onClick={seedDefaultFormulas}
                    className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    Ajouter les formules par défaut
                  </button>
                </motion.div>
              )}
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                <StatCard 
                  title="Total Contact" 
                  value={stats.totalContacts} 
                  icon={Users} 
                  color="bg-blue-50 text-blue-600"
                />
                <StatCard 
                  title="Digital" 
                  value={`${stats.digitalPercentage.toFixed(1)}%`} 
                  icon={TrendingUp} 
                  color="bg-cyan-50 text-cyan-600"
                />
                <StatCard 
                  title="Taux RDV" 
                  value={`${stats.appointmentRate.toFixed(1)}%`} 
                  icon={Calendar} 
                  color="bg-indigo-50 text-indigo-600"
                />
                <StatCard 
                  title="Taux Show-up" 
                  value={`${stats.showUpRate.toFixed(1)}%`} 
                  icon={UserCheck} 
                  color="bg-emerald-50 text-emerald-600"
                />
                <StatCard 
                  title="Taux Closing" 
                  value={`${stats.closingRate.toFixed(1)}%`} 
                  icon={CheckCircle2} 
                  color="bg-violet-50 text-violet-600"
                />
                <StatCard 
                  title="Chiffre d'Affaires" 
                  value={formatPrice(stats.totalRevenue).ht} 
                  subValue={formatPrice(stats.totalRevenue).ttc}
                  icon={TrendingUp} 
                  color="bg-indigo-600 text-white"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6">
                <StatCard 
                  title="Total Adhérents" 
                  value={stats.totalAdherents} 
                  icon={UserCheck} 
                  color="bg-indigo-50 text-indigo-600"
                />
                <StatCard 
                  title="Total Clients (sans formule)" 
                  value={stats.totalClients} 
                  icon={UserCheck} 
                  color="bg-emerald-50 text-emerald-600"
                />
                <StatCard 
                  title="Signatures" 
                  value={stats.signatures} 
                  icon={CheckCircle2} 
                  color="bg-violet-50 text-violet-600"
                />
                <div 
                  className="cursor-pointer transition-transform active:scale-95"
                  onClick={() => {
                    const next: Record<string, 'week' | 'month' | 'year'> = {
                      month: 'year',
                      year: 'week',
                      week: 'month'
                    };
                    setBasketPeriod(next[basketPeriod]);
                  }}
                >
                  <StatCard 
                    title={`Panier Moyen (${basketPeriod === 'week' ? 'Sem' : basketPeriod === 'month' ? 'Mois' : 'An'})`} 
                    value={formatPrice(stats.averageBasket * (basketPeriod === 'week' ? 12/52 : basketPeriod === 'year' ? 12 : 1)).ht} 
                    subValue={formatPrice(stats.averageBasket * (basketPeriod === 'week' ? 12/52 : basketPeriod === 'year' ? 12 : 1)).ttc}
                    icon={TrendingUp} 
                    color="bg-amber-50 text-amber-600"
                  />
                </div>
                <StatCard 
                  title="Taux Décroché" 
                  value={`${stats.pickupRate.toFixed(1)}%`} 
                  icon={Clock} 
                  color="bg-indigo-50 text-indigo-600"
                />
                <StatCard 
                  title="Taux Résiliation" 
                  value={`${stats.churnRate.toFixed(1)}%`} 
                  icon={Ban} 
                  color="bg-rose-50 text-rose-600"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Chart */}
                <div className="lg:col-span-1 glass-card p-4 md:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-slate-800">Présence</h3>
                    <div className="p-1 bg-slate-100 rounded-lg">
                      <Filter className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                  <AttendanceChart 
                    data={attendanceData} 
                    title="Présence" 
                    colors={['#10b981', '#f59e0b', '#ef4444', '#94a3b8']} 
                  />
                  <div className="mt-6 space-y-3">
                    {attendanceData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", 
                            item.name === 'Venus' ? "bg-emerald-500" : 
                            item.name === 'Non-venus' ? "bg-amber-500" : 
                            item.name === 'Annulés' ? "bg-rose-500" : "bg-slate-400"
                          )} />
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-medium text-slate-900">
                          {((item.value / (stats.totalContacts || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Appointment Source Chart */}
                <div className="lg:col-span-1 glass-card p-4 md:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-slate-800">Rendez-vous</h3>
                  </div>
                  <AttendanceChart 
                    data={sourceData} 
                    title="Sources" 
                    colors={['#6366f1', '#8b5cf6']} 
                  />
                  <div className="mt-6 space-y-3">
                    {sourceData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", 
                            i === 0 ? "bg-indigo-500" : "bg-violet-500"
                          )} />
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-medium text-slate-900">
                          {((item.value / (stats.appointmentsTaken || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Histogram */}
                <div className="lg:col-span-1 glass-card p-4 md:p-6">
                  <h3 className="font-semibold text-slate-800 mb-6">Activité par jour</h3>
                  <DailyHistogram data={stats.dailyStats} />
                </div>
              </div>

              {/* Historique des Saisies */}
              <div className="glass-card p-4 md:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">Historique des Saisies</h3>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                    {manualStats.length} rapports enregistrés
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Période</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Contacts</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Digital</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Bloc-notes</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">RDV</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Venus</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Signés</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Appels/Décr.</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {manualStats.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-sm font-medium text-slate-700">
                                {entry.period_type === 'day' ? format(new Date(entry.period_start), 'dd MMM yyyy', { locale: fr }) : 
                                 entry.period_type === 'week' ? `Semaine du ${format(new Date(entry.period_start), 'dd MMM', { locale: fr })}` :
                                 format(new Date(entry.period_start), 'MMMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600 font-medium">{entry.totalContacts}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-bold text-cyan-600">{entry.contactsDigital}</span>
                              <span className="text-[10px] text-slate-400">({entry.totalContacts > 0 ? ((entry.contactsDigital / entry.totalContacts) * 100).toFixed(0) : 0}%)</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => {
                                const logDate = entry.period_type === 'day' ? entry.period_start : format(new Date(), 'yyyy-MM-dd');
                                setEditingDailyLog({
                                  date: logDate,
                                  appointments: 0,
                                  showedUp: 0,
                                  signed: 0,
                                  notSigned: 0,
                                  pending: 0,
                                  noShow: 0,
                                  digital: 0,
                                  nonDigital: 0
                                });
                                setIsDailyLogModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                              title="Ouvrir le bloc-notes"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600 font-medium">{entry.appointmentsTaken}</td>
                          <td className="px-4 py-3 text-center text-sm text-emerald-600 font-bold">{entry.showedUp}</td>
                          <td className="px-4 py-3 text-center text-sm text-violet-600 font-bold">{entry.signed}</td>
                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {entry.totalCalls || 0} / {entry.totalPickups || 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingManualStats(entry);
                                  setIsManualStatsModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => entry.id && handleDeleteManualStats(entry.id)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-300 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {manualStats.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm italic">
                            Aucune saisie enregistrée pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Rechercher un client..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    {[
                      { id: 'all', label: 'Tous' },
                      { id: 'client', label: 'Clients' },
                      { id: 'membre', label: 'Membres' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setClientTypeFilter(t.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                          clientTypeFilter === t.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    {[
                      { id: 'all', label: 'Période' },
                      { id: 'week', label: 'Sem.' },
                      { id: 'month', label: 'Mois' },
                      { id: 'year', label: 'An' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setFormulaPeriodFilter(p.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                          formulaPeriodFilter === p.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    {[
                      { id: 'all', label: 'Statut' },
                      { id: 'active', label: 'Actif' },
                      { id: 'inactive', label: 'Résilié' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setStatusFilter(s.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                          statusFilter === s.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    <select
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-transparent border-none focus:ring-0 text-slate-500 cursor-pointer"
                      value={specificFormulaFilter}
                      onChange={(e) => setSpecificFormulaFilter(e.target.value)}
                    >
                      <option value="all">Toutes Formules</option>
                      {formulas.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 md:p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Formule</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date d'inscription</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                {client.firstName[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-slate-900">{client.firstName} {client.lastName || ''}</p>
                                  <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                    client.formulaId 
                                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200" 
                                      : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  )}>
                                    {client.formulaId ? 'Adhérent' : 'Client'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">{client.phone || 'Pas de téléphone'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              className="text-xs bg-slate-100 border-none rounded-lg px-2 py-1 focus:ring-0 cursor-pointer"
                              value={client.formulaId || ''}
                              onChange={(e) => handleUpdateStatus(client.id, { formulaId: e.target.value })}
                            >
                              <option value="">Choisir formule...</option>
                              {formulas.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(new Date(client.createdAt), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handleUpdateStatus(client.id, { isActive: !client.isActive, deactivatedAt: !client.isActive ? null : new Date().toISOString() })}
                              className={cn(
                                "text-xs px-3 py-1 rounded-full font-bold transition-all",
                                client.isActive 
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                  : "bg-rose-100 text-rose-700 border border-rose-200"
                              )}
                            >
                              {client.isActive ? 'ACTIF' : 'RÉSILIÉ'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setClientToEdit(client);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setClientToDelete(client);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredClients.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">Aucun client trouvé</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'relances' && (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Relances Programmées</h3>
                  <p className="text-sm text-slate-500">Gérez vos appels de suivi pour les prospects en attente</p>
                </div>
                <button 
                  onClick={() => setIsRelanceModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  À rappeler avant
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relances.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-6 h-6 text-amber-500" />
                    </div>
                    <p className="text-slate-500 text-sm">Aucune relance programmée</p>
                  </div>
                ) : (
                  relances.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(relance => {
                    const isOverdue = new Date(relance.dueDate) < new Date() && relance.status === 'PENDING';
                    
                    return (
                      <div key={relance.id} className={cn(
                        "bg-white p-5 rounded-2xl border transition-all",
                        relance.status === 'COMPLETED' ? "border-emerald-200 bg-emerald-50/30 opacity-75" :
                        relance.status === 'CANCELLED' ? "border-slate-200 bg-slate-50 opacity-50" :
                        isOverdue ? "border-rose-200 shadow-lg shadow-rose-100/50" : "border-slate-200 hover:border-amber-300 hover:shadow-lg"
                      )}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              relance.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-600" :
                              relance.status === 'CANCELLED' ? "bg-slate-200 text-slate-500" :
                              isOverdue ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                            )}>
                              {relance.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> :
                               relance.status === 'CANCELLED' ? <X className="w-5 h-5" /> :
                               <Clock className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">{relance.name}</h4>
                              <div className={cn(
                                "text-xs font-medium flex items-center gap-1",
                                isOverdue ? "text-rose-600" : "text-slate-500"
                              )}>
                                <Calendar className="w-3 h-3" />
                                {format(new Date(relance.dueDate), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {relance.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <a href={`tel:${relance.phone}`} className="hover:text-indigo-600 transition-colors">{relance.phone}</a>
                            </div>
                          )}
                          {relance.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <a href={`mailto:${relance.email}`} className="hover:text-indigo-600 transition-colors truncate">{relance.email}</a>
                            </div>
                          )}
                          {relance.notes && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 italic border border-slate-100">
                              "{relance.notes}"
                            </div>
                          )}
                        </div>

                        {relance.status === 'PENDING' && (
                          <div className="flex gap-2 pt-4 border-t border-slate-100">
                            <button 
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'relances', relance.id.toString()), { status: 'COMPLETED' });
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.UPDATE, `relances/${relance.id}`);
                                }
                              }}
                              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Fait
                            </button>
                            <button 
                              onClick={async () => {
                                showConfirm('Annuler la relance', 'Voulez-vous vraiment annuler cette relance ?', async () => {
                                  try {
                                    await updateDoc(doc(db, 'relances', relance.id.toString()), { status: 'CANCELLED' });
                                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.UPDATE, `relances/${relance.id}`);
                                  }
                                });
                              }}
                              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Annuler
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-8">
                  <div className="glass-card p-4 md:p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-800">Gestion des Formules</h3>
                      <button 
                        onClick={() => {
                          setFormulaToEdit(null);
                          setNewFormula({ name: '', price: 0, period: 'month' });
                          setIsFormulaModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm shadow-indigo-200"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une formule
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {formulas.map((f) => (
                        <div key={f.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-900">{f.name}</p>
                              <p className="text-2xl font-bold text-indigo-600 mt-1">
                                {formatPrice(f.price).ht} <span className="text-xs text-slate-400 font-normal">/ {f.period === 'week' ? 'semaine' : f.period === 'month' ? 'mois' : 'an'}</span>
                              </p>
                              <p className="text-xs text-slate-400 font-medium">
                                {formatPrice(f.price).ttc}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setFormulaToEdit(f);
                                  setNewFormula({ 
                                    name: f.name, 
                                    price: f.price, 
                                    period: f.period,
                                    almaCommission: f.almaCommission || 0
                                  });
                                  setIsFormulaModalOpen(true);
                                }}
                                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteFormula(f.id)}
                                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>



                  <div className="glass-card p-4 md:p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Exportation des données clients</h3>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          const csv = Papa.unparse(clients);
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.setAttribute('download', `export_clients_${format(new Date(), 'yyyy-MM-dd')}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-900 rounded-2xl text-sm font-semibold hover:bg-slate-200 transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        Exporter Clients CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="glass-card p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Intégration CRM</h3>
                    <div className="bg-slate-900 rounded-2xl p-6 text-white">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Plateforme</p>
                      <p className="text-lg mt-1 font-medium">GoHighLevel</p>
                      <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors border border-white/10">
                        Configurer la connexion
                      </button>
                    </div>
                  </div>

                  <div className="glass-card p-4 md:p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Importation Base Clients (Logiciel Gestion Club)</h3>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".csv" 
                        onChange={handleClientFileUpload}
                        disabled={isImporting}
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                          <Users className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Cliquez pour importer votre base clients</p>
                        <p className="text-xs text-slate-500 mt-1">Format CSV (Logiciel de gestion club)</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-slate-500 italic">
                      L'importation détecte automatiquement les noms, prénoms, emails, téléphones, dates de naissance et d'inscription, ainsi que le statut (actif/résilié).
                    </p>
                  </div>

                  <div className="glass-card p-4 md:p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Importation base client prospect</h3>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".csv,.xlsx,.xls" 
                        onChange={handleFileUpload}
                        disabled={isImporting}
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Cliquez pour importer un fichier</p>
                        <p className="text-xs text-slate-500 mt-1">CSV, XLSX ou XLS supportés</p>
                      </div>
                    </div>
                    {isImporting && (
                      <div className="mt-4 flex items-center gap-3 text-indigo-600">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">Importation en cours...</p>
                      </div>
                    )}
                  </div>

                  <div className="glass-card p-4 md:p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Importation Reporting Setter</h3>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".csv,.xlsx,.xls" 
                        onChange={handleSetterImport}
                        disabled={isImportingSetter}
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Cliquez pour importer le reporting setter</p>
                        <p className="text-xs text-slate-500 mt-1">Met à jour les appels et décrochés</p>
                      </div>
                    </div>
                    {isImportingSetter && (
                      <div className="mt-4 flex items-center gap-3 text-emerald-600">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">Importation en cours...</p>
                      </div>
                    )}
                  </div>


                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
          <button onClick={() => setActiveTab('dashboard')} className={cn("flex flex-col items-center gap-1", activeTab === 'dashboard' ? "text-indigo-600" : "text-slate-400")}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('clients')} className={cn("flex flex-col items-center gap-1", activeTab === 'clients' ? "text-indigo-600" : "text-slate-400")}>
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Membres</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={cn("flex flex-col items-center gap-1", activeTab === 'settings' ? "text-indigo-600" : "text-slate-400")}>
            <Filter className="w-5 h-5" />
            <span className="text-[10px] font-medium">Paramètres</span>
          </button>
        </div>
      </main>

      {/* Modal - Nouveau Membre */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Nouveau Membre</h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Prénom</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({...newClient, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nom</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({...newClient, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                <input 
                  type="email"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Date de naissance</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={newClient.birthDate}
                    onChange={(e) => setNewClient({...newClient, birthDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Téléphone</label>
                  <input 
                    type="tel"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Adresse postale</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Formule</label>
                <select 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={newClient.formulaId || ''}
                  onChange={(e) => setNewClient({...newClient, formulaId: e.target.value})}
                >
                  <option value="">Choisir une formule...</option>
                  {formulas.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({formatPrice(f.price).ht} / {formatPrice(f.price).ttc})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Date d'inscription</label>
                <input 
                  type="date"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={newClient.createdAt}
                  onChange={(e) => setNewClient({...newClient, createdAt: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                >
                  Ajouter le membre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Modifier Membre */}
      {isEditModalOpen && clientToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Modifier Membre</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditClient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Prénom</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={clientToEdit.firstName}
                    onChange={(e) => setClientToEdit({...clientToEdit, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nom</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={clientToEdit.lastName || ''}
                    onChange={(e) => setClientToEdit({...clientToEdit, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                <input 
                  type="email"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={clientToEdit.email || ''}
                  onChange={(e) => setClientToEdit({...clientToEdit, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Date de naissance</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={clientToEdit.birthDate || ''}
                    onChange={(e) => setClientToEdit({...clientToEdit, birthDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Téléphone</label>
                  <input 
                    type="tel"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={clientToEdit.phone || ''}
                    onChange={(e) => setClientToEdit({...clientToEdit, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Adresse postale</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={clientToEdit.address || ''}
                  onChange={(e) => setClientToEdit({...clientToEdit, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Formule</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={clientToEdit.formulaId || ''}
                    onChange={(e) => setClientToEdit({...clientToEdit, formulaId: e.target.value})}
                  >
                    <option value="">Choisir formule...</option>
                    {formulas.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({formatPrice(f.price).ht} / {formatPrice(f.price).ttc})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Date d'inscription</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={clientToEdit.createdAt.split('T')[0]}
                    onChange={(e) => setClientToEdit({...clientToEdit, createdAt: new Date(e.target.value).toISOString()})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Statut</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setClientToEdit({...clientToEdit, isActive: true, deactivatedAt: null})}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                      clientToEdit.isActive ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    Actif
                  </button>
                  <button 
                    type="button"
                    onClick={() => setClientToEdit({...clientToEdit, isActive: false, deactivatedAt: new Date().toISOString()})}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                      !clientToEdit.isActive ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    Résilié
                  </button>
                </div>
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Confirmation Suppression */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-slate-500 mb-6">
                Êtes-vous sûr de vouloir supprimer <strong>{clientToDelete?.firstName} {clientToDelete?.lastName || ''}</strong> ? Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleDeleteClient}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-rose-200"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Reporting WhatsApp */}
      {isReportingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Reporting WhatsApp</h3>
              <button onClick={() => setIsReportingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Range Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Période du rapport</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'day', label: 'Aujourd\'hui' },
                    { id: 'week', label: 'Semaine' },
                    { id: 'month', label: 'Mois' },
                    { id: 'all', label: 'Complet' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setReportRange(r.id as any)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                        reportRange === r.id 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp Numbers Management */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Destinataires WhatsApp</label>
                <div className="flex gap-2">
                  <input 
                    type="tel"
                    placeholder="+336..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={newWhatsappNumber}
                    onChange={(e) => setNewWhatsappNumber(e.target.value)}
                  />
                  <button 
                    onClick={handleAddWhatsapp}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {whatsappNumbers.map((num) => (
                    <div key={num} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="whatsapp" 
                          checked={selectedWhatsapp === num}
                          onChange={() => setSelectedWhatsapp(num)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">{num}</span>
                      </div>
                      <button onClick={() => handleRemoveWhatsapp(num)} className="text-slate-400 hover:text-rose-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Aperçu du message</label>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-mono text-emerald-900 whitespace-pre-wrap">
                  {isFetchingStats ? 'Chargement des chiffres...' : generateReportText()}
                </div>
              </div>

              <button 
                onClick={handleSendWhatsapp}
                disabled={!selectedWhatsapp || isFetchingStats}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Envoyer sur WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal - Formule */}
      {isFormulaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {formulaToEdit ? 'Modifier la formule' : 'Nouvelle formule'}
              </h3>
              <div className="flex items-center gap-3">
                {!formulaToEdit && (
                  <button 
                    type="button"
                    onClick={seedDefaultFormulas}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider"
                  >
                    Formules par défaut
                  </button>
                )}
                <button onClick={() => setIsFormulaModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user) return;
                try {
                  if (formulaToEdit) {
                    await updateDoc(doc(db, 'formulas', formulaToEdit.id.toString()), newFormula);
                  } else {
                    await addDoc(collection(db, 'formulas'), {
                      ...newFormula,
                      uid: user.uid
                    });
                  }
                  setIsFormulaModalOpen(false);
                } catch (error) {
                  handleFirestoreError(error, OperationType.WRITE, 'formulas');
                }
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Nom de la formule</label>
                <input 
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={newFormula.name}
                  onChange={(e) => setNewFormula({...newFormula, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Prix (€ TTC)</label>
                <div className="flex gap-2">
                  <input 
                    required
                    type="number"
                    step="0.01"
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={newFormula.price}
                    onChange={(e) => setNewFormula({...newFormula, price: parseFloat(e.target.value)})}
                  />
                  <select
                    className="w-32 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={newFormula.period}
                    onChange={(e) => setNewFormula({...newFormula, period: e.target.value as any})}
                  >
                    <option value="week">/ Semaine</option>
                    <option value="month">/ Mois</option>
                    <option value="year">/ An (Alma)</option>
                  </select>
                </div>
                {newFormula.period === 'year' && (
                  <div className="mt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Commission Alma (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="Ex: 3.8"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={newFormula.almaCommission || ''}
                      onChange={(e) => setNewFormula({...newFormula, almaCommission: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                )}
                {newFormula.price > 0 && (
                  <div className="space-y-1 mt-2">
                    <p className="text-[10px] text-slate-400 font-medium italic">
                      Équivalent TTC : {formatPrice(newFormula.price).ttc} (HT : {formatPrice(newFormula.price).ht})
                    </p>
                    {newFormula.period === 'year' && newFormula.almaCommission && (
                      <p className="text-[10px] text-indigo-600 font-bold">
                        Net après commission ({newFormula.almaCommission}%) : {(newFormula.price * (1 - newFormula.almaCommission / 100)).toFixed(2)}€
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                >
                  {formulaToEdit ? 'Enregistrer' : 'Créer la formule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal - Saisie Rapide / Ajustements */}
      {isManualStatsModalOpen && editingManualStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Saisie Chiffres</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enregistrez vos chiffres pour mettre à jour le tableau de bord</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsImportSelectionModalOpen(true);
                    setSelectedLogIds([]);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Importer du Bloc-notes
                </button>
                <button onClick={() => setIsManualStatsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingManualStats || !user) return;
                try {
                  if (editingManualStats.id) {
                    const updates = { ...editingManualStats };
                    delete (updates as any).id;
                    await updateDoc(doc(db, 'manualStats', editingManualStats.id.toString()), updates);
                  } else {
                    await addDoc(collection(db, 'manualStats'), {
                      ...editingManualStats,
                      uid: user.uid
                    });
                  }
                  setIsManualStatsModalOpen(false);
                } catch (error) {
                  handleFirestoreError(error, OperationType.WRITE, 'manualStats');
                }
              }} 
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type de période</label>
                  <div className="flex gap-2">
                    {['day', 'week', 'month'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditingManualStats({ ...editingManualStats!, period_type: type as 'day' | 'week' | 'month' })}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                          editingManualStats.period_type === type 
                            ? "bg-slate-900 text-white shadow-md" 
                            : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {type === 'day' ? 'Jour' : type === 'week' ? 'Semaine' : 'Mois'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {editingManualStats.period_type === 'day' ? 'Date du jour' : 
                     editingManualStats.period_type === 'week' ? 'Semaine du' : 'Mois de'}
                  </label>
                  {editingManualStats.period_type === 'week' ? (
                    <select
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={editingManualStats.period_start}
                      onChange={(e) => setEditingManualStats({...editingManualStats, period_start: e.target.value})}
                    >
                      <option value="">Sélectionner une semaine...</option>
                      {generateWeeks().map(w => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  ) : editingManualStats.period_type === 'month' ? (
                    <select
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={editingManualStats.period_start}
                      onChange={(e) => setEditingManualStats({...editingManualStats, period_start: e.target.value})}
                    >
                      <option value="">Sélectionner un mois...</option>
                      {generateMonths().map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={editingManualStats.period_start}
                      onChange={(e) => setEditingManualStats({...editingManualStats, period_start: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Prospection & RDV</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Nouveaux Contacts</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="0"
                      value={editingManualStats.totalContacts || ''}
                      onChange={(e) => {
                        const total = parseInt(e.target.value) || 0;
                        setEditingManualStats({
                          ...editingManualStats, 
                          totalContacts: total,
                          contactsDigital: total,
                          contactsNonDigital: 0
                        });
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Digital</label>
                      <input 
                        disabled
                        type="number"
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                        value={editingManualStats.contactsDigital}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Non Digital</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="0"
                        value={editingManualStats.contactsNonDigital || ''}
                        onChange={(e) => {
                          const nonDigital = parseInt(e.target.value) || 0;
                          const total = editingManualStats.totalContacts || 0;
                          setEditingManualStats({
                            ...editingManualStats, 
                            contactsNonDigital: nonDigital,
                            contactsDigital: Math.max(0, total - nonDigital)
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Total Rendez-vous</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="0"
                      value={editingManualStats.appointmentsTaken || ''}
                      onChange={(e) => {
                        const total = parseInt(e.target.value) || 0;
                        const setter = editingManualStats.appointmentsSetter || 0;
                        const showedUp = total; 
                        const signed = showedUp; // Auto-set signed to showedUp
                        
                        setEditingManualStats({
                          ...editingManualStats, 
                          appointmentsTaken: total,
                          appointmentsProspect: Math.max(0, total - setter),
                          showedUp: showedUp,
                          signed: signed,
                          notSigned: 0
                        });
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Par Setter</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="0"
                        value={editingManualStats.appointmentsSetter || ''}
                        onChange={(e) => {
                          const setter = parseInt(e.target.value) || 0;
                          const total = editingManualStats.appointmentsTaken || 0;
                          setEditingManualStats({
                            ...editingManualStats, 
                            appointmentsSetter: setter,
                            appointmentsProspect: Math.max(0, total - setter)
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Par Prospect</label>
                      <input 
                        disabled
                        type="number"
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                        value={editingManualStats.appointmentsProspect}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".csv,.xlsx,.xls" 
                        onChange={handleSetterImport}
                        disabled={isImportingSetter}
                      />
                      <p className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {isImportingSetter ? 'Importation...' : 'Importer le reporting setter (Appels/Décrochés)'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-l-2 border-emerald-500 pl-2">Présence & Ventes</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Venus (Show-up)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="0"
                        value={editingManualStats.showedUp || ''}
                        onChange={(e) => {
                          const showedUp = parseInt(e.target.value) || 0;
                          const notSigned = editingManualStats.notSigned || 0;
                          setEditingManualStats({
                            ...editingManualStats, 
                            showedUp: showedUp,
                            signed: Math.max(0, showedUp - notSigned)
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Non Venus</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="0"
                        value={editingManualStats.noShow || ''}
                        onChange={(e) => {
                          const noShow = parseInt(e.target.value) || 0;
                          const total = editingManualStats.appointmentsTaken || 0;
                          const cancelled = editingManualStats.cancelled || 0;
                          const showedUp = Math.max(0, total - noShow - cancelled);
                          const signed = editingManualStats.signed || 0;
                          
                          setEditingManualStats({
                            ...editingManualStats, 
                            noShow: noShow,
                            showedUp: showedUp,
                            notSigned: Math.max(0, showedUp - signed)
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Annulés</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="0"
                        value={editingManualStats.cancelled || ''}
                        onChange={(e) => {
                          const cancelled = parseInt(e.target.value) || 0;
                          const total = editingManualStats.appointmentsTaken || 0;
                          const noShow = editingManualStats.noShow || 0;
                          const showedUp = Math.max(0, total - noShow - cancelled);
                          const notSigned = editingManualStats.notSigned || 0;

                          setEditingManualStats({
                            ...editingManualStats, 
                            cancelled: cancelled,
                            showedUp: showedUp,
                            signed: Math.max(0, showedUp - notSigned)
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Signés</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-violet-50 border border-violet-100 rounded-xl text-sm font-bold text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        placeholder="0"
                        value={editingManualStats.signed || ''}
                        onChange={(e) => {
                          const signed = parseInt(e.target.value) || 0;
                          const showedUp = editingManualStats.showedUp || 0;
                          setEditingManualStats({
                            ...editingManualStats, 
                            signed: signed,
                            notSigned: Math.max(0, showedUp - signed)
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Pas signés</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="0"
                        value={editingManualStats.notSigned || ''}
                        onChange={(e) => {
                          const notSigned = parseInt(e.target.value) || 0;
                          const showedUp = editingManualStats.showedUp || 0;
                          setEditingManualStats({
                            ...editingManualStats, 
                            notSigned: notSigned,
                            signed: Math.max(0, showedUp - notSigned)
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Valider les chiffres
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Selection Modal */}
      {isImportSelectionModalOpen && editingManualStats && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sélectionner les notes</h3>
                <p className="text-xs text-slate-500 mt-0.5">Choisissez les notes à additionner</p>
              </div>
              <button onClick={() => setIsImportSelectionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {dailyLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  Aucune note disponible
                </div>
              ) : (
                dailyLogs.map(log => (
                  <label 
                    key={log.id} 
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                      selectedLogIds.includes(log.id!) 
                        ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      selectedLogIds.includes(log.id!)
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-300 group-hover:border-indigo-400"
                    )}>
                      {selectedLogIds.includes(log.id!) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={selectedLogIds.includes(log.id!)}
                      onChange={() => {
                        if (selectedLogIds.includes(log.id!)) {
                          setSelectedLogIds(selectedLogIds.filter(id => id !== log.id));
                        } else {
                          setSelectedLogIds([...selectedLogIds, log.id!]);
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-700">{format(new Date(log.date), 'dd MMMM yyyy', { locale: fr })}</div>
                      <div className="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                        <span>{log.appointments} RDV</span>
                        <span>•</span>
                        <span>{log.showedUp} Venus</span>
                        <span>•</span>
                        <span>{log.signed} Signés</span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                disabled={selectedLogIds.length === 0}
                onClick={() => {
                  const selectedLogs = dailyLogs.filter(log => selectedLogIds.includes(log.id!));
                  const totals = selectedLogs.reduce((acc, log) => ({
                    appointments: acc.appointments + (log.appointments || 0),
                    showedUp: acc.showedUp + (log.showedUp || 0),
                    signed: acc.signed + (log.signed || 0),
                    notSigned: acc.notSigned + (log.notSigned || 0),
                    noShow: acc.noShow + (log.noShow || 0),
                    digital: acc.digital + (log.digital || 0),
                    nonDigital: acc.nonDigital + (log.nonDigital || 0)
                  }), { appointments: 0, showedUp: 0, signed: 0, notSigned: 0, noShow: 0, digital: 0, nonDigital: 0 });

                  setEditingManualStats({
                    ...editingManualStats,
                    appointmentsTaken: totals.appointments,
                    showedUp: totals.showedUp,
                    signed: totals.signed,
                    notSigned: totals.notSigned,
                    noShow: totals.noShow,
                    contactsDigital: totals.digital,
                    contactsNonDigital: totals.nonDigital,
                    totalContacts: totals.digital + totals.nonDigital
                  });
                  setIsImportSelectionModalOpen(false);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Importer {selectedLogIds.length} note{selectedLogIds.length > 1 ? 's' : ''}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal - Bloc-notes (Daily Log) */}
      {isDailyLogModalOpen && editingDailyLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bloc-notes Quotidien</h3>
                <p className="text-xs text-slate-500 mt-0.5">Notez vos rendez-vous du jour rapidement</p>
              </div>
              <button onClick={() => setIsDailyLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDailyLogSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                <input 
                  required
                  type="date"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={editingDailyLog.date}
                  onChange={(e) => setEditingDailyLog({...editingDailyLog, date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rendez-vous</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={editingDailyLog.appointments || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setEditingDailyLog({
                        ...editingDailyLog,
                        appointments: val,
                        showedUp: val,
                        noShow: 0,
                        signed: val,
                        notSigned: 0,
                        pending: 0,
                        digital: val,
                        nonDigital: 0
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Non Venus</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={editingDailyLog.noShow || ''}
                    onChange={(e) => {
                      const noShow = parseInt(e.target.value) || 0;
                      const appointments = editingDailyLog.appointments || 0;
                      const showedUp = Math.max(0, appointments - noShow);
                      setEditingDailyLog({
                        ...editingDailyLog,
                        noShow: noShow,
                        showedUp: showedUp,
                        signed: showedUp,
                        notSigned: 0,
                        pending: 0
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venus</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={editingDailyLog.showedUp || ''}
                    onChange={(e) => {
                      const showedUp = parseInt(e.target.value) || 0;
                      setEditingDailyLog({
                        ...editingDailyLog,
                        showedUp: showedUp,
                        signed: Math.max(0, showedUp - (editingDailyLog.notSigned || 0) - (editingDailyLog.pending || 0))
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signés</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={editingDailyLog.signed || ''}
                    onChange={(e) => setEditingDailyLog({...editingDailyLog, signed: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pas Signés</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    value={editingDailyLog.notSigned || ''}
                    onChange={(e) => {
                      const notSigned = parseInt(e.target.value) || 0;
                      const showedUp = editingDailyLog.showedUp || 0;
                      const pending = editingDailyLog.pending || 0;
                      setEditingDailyLog({
                        ...editingDailyLog,
                        notSigned: notSigned,
                        signed: Math.max(0, showedUp - notSigned - pending)
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En attente</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-sm font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    value={editingDailyLog.pending || ''}
                    onChange={(e) => {
                      const pending = parseInt(e.target.value) || 0;
                      const showedUp = editingDailyLog.showedUp || 0;
                      const notSigned = editingDailyLog.notSigned || 0;
                      
                      if (pending > (editingDailyLog.pending || 0)) {
                        setIsRelanceModalOpen(true);
                      }

                      setEditingDailyLog({
                        ...editingDailyLog,
                        pending: pending,
                        signed: Math.max(0, showedUp - notSigned - pending)
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Digital</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={editingDailyLog.digital || ''}
                    onChange={(e) => setEditingDailyLog({...editingDailyLog, digital: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Non Digital</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={editingDailyLog.nonDigital || ''}
                    onChange={(e) => {
                      const nonDigital = parseInt(e.target.value) || 0;
                      const appointments = editingDailyLog.appointments || 0;
                      setEditingDailyLog({
                        ...editingDailyLog,
                        nonDigital: nonDigital,
                        digital: Math.max(0, appointments - nonDigital)
                      });
                    }}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer la note
                </button>
              </div>
            </form>

            <div className="p-6 bg-slate-50 border-t border-slate-100 max-h-60 overflow-y-auto">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Notes récentes</h4>
              <div className="space-y-2">
                {dailyLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center group">
                    <div>
                      <div className="text-xs font-bold text-slate-700">{format(new Date(log.date), 'dd MMMM', { locale: fr })}</div>
                      <div className="text-[10px] text-slate-400">
                        {log.appointments} RDV • {log.showedUp} Venus • {log.signed} Signés • {log.noShow} Non Venus
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingDailyLog(log)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => log.id && handleDeleteDailyLog(log.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isRelanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">À rappeler avant</h3>
                  <p className="text-xs text-slate-500 font-medium">Programmer les rappels J-1 et Jour J</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRelanceModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRelanceSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nom du prospect *</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="Ex: Jean Dupont"
                  value={relanceFormData.name}
                  onChange={(e) => setRelanceFormData({...relanceFormData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Téléphone</label>
                  <input 
                    type="tel" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Ex: 06..."
                    value={relanceFormData.phone}
                    onChange={(e) => setRelanceFormData({...relanceFormData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date cible *</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    value={relanceFormData.targetDate}
                    onChange={(e) => setRelanceFormData({...relanceFormData, targetDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes (Optionnel)</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none h-20"
                  placeholder="Détails sur l'attente..."
                  value={relanceFormData.notes}
                  onChange={(e) => setRelanceFormData({...relanceFormData, notes: e.target.value})}
                />
              </div>

              {relanceFormData.targetDate && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                    <span>Programme des rappels</span>
                    <Clock className="w-3 h-3" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Rappel J-1 :</span>
                      <span className="font-bold text-amber-700">
                        {format(new Date(new Date(relanceFormData.targetDate).setDate(new Date(relanceFormData.targetDate).getDate() - 1)), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Rappel Jour J :</span>
                      <span className="font-bold text-amber-700">
                        {format(new Date(relanceFormData.targetDate), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Programmer la relance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-500 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-200"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-4 right-4 z-[100] px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3",
          toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
