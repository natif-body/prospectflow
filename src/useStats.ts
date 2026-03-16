import { useMemo } from 'react';
import { Client, Formula, ManualStats, DashboardStats } from './types';

export function useStats(
  clients: Client[],
  formulas: Formula[],
  manualStats: ManualStats[],
  startDate?: string,
  endDate?: string
): DashboardStats | null {
  return useMemo(() => {
    if (!clients || !manualStats) return null;

    let manualStatsSum = {
      totalContacts: 0,
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
      contactsDigital: 0,
      contactsNonDigital: 0
    };

    let manualEntries = manualStats;
    if (startDate && endDate) {
      manualEntries = manualStats.filter(entry => 
        entry.period_start >= startDate && entry.period_start <= endDate
      );
    }

    manualEntries.forEach(entry => {
      manualStatsSum.totalContacts += entry.totalContacts || 0;
      manualStatsSum.appointmentsTaken += entry.appointmentsTaken || 0;
      manualStatsSum.appointmentsProspect += entry.appointmentsProspect || 0;
      manualStatsSum.appointmentsSetter += entry.appointmentsSetter || 0;
      manualStatsSum.showedUp += entry.showedUp || 0;
      manualStatsSum.noShow += entry.noShow || 0;
      manualStatsSum.cancelled += entry.cancelled || 0;
      manualStatsSum.signed += entry.signed || 0;
      manualStatsSum.notSigned += entry.notSigned || 0;
      manualStatsSum.totalCalls += entry.totalCalls || 0;
      manualStatsSum.totalPickups += entry.totalPickups || 0;
      manualStatsSum.contactsDigital += entry.contactsDigital || 0;
      manualStatsSum.contactsNonDigital += entry.contactsNonDigital || 0;
    });

    // Churn calculation based on clients table (only those with a formula)
    let totalSigned = 0;
    let totalCancelled = 0;
    let activeAdherents = 0;
    let activeClients = 0;

    clients.forEach(c => {
      if (c.formulaId) {
        totalSigned++;
        if (!c.isActive) totalCancelled++;
        if (c.isActive) activeAdherents++;
      } else {
        if (c.isActive) activeClients++;
      }
    });

    const churnRate = totalSigned > 0 ? (totalCancelled / totalSigned) * 100 : 0;

    // Average basket and total revenue
    let totalRevenueTTC = 0;
    let totalRevenueHT = 0;
    let signedCount = 0;

    clients.forEach(c => {
      if (c.isActive && c.formulaId) {
        const formula = formulas.find(f => f.id.toString() === c.formulaId?.toString());
        if (formula) {
          if (!startDate || !endDate || (c.createdAt >= startDate && c.createdAt <= endDate)) {
            let priceTTC = formula.price;
            let priceHT = formula.price / 1.2;
            
            // Apply Alma commission for annual formulas if specified (commission is calculated on HT price)
            if (formula.period === 'year' && formula.almaCommission) {
              const commissionAmount = priceHT * (formula.almaCommission / 100);
              priceTTC = priceTTC - commissionAmount;
              priceHT = priceHT - commissionAmount;
            }
            totalRevenueTTC += priceTTC;
            totalRevenueHT += priceHT;
            signedCount++;
          }
        }
      }
    });

    const averageBasketTTC = signedCount > 0 ? totalRevenueTTC / signedCount : 0;
    const averageBasketHT = signedCount > 0 ? totalRevenueHT / signedCount : 0;

    const totalAppointments = manualStatsSum.showedUp + manualStatsSum.noShow + manualStatsSum.cancelled;
    const showUpRate = totalAppointments > 0 ? (manualStatsSum.showedUp / totalAppointments) * 100 : 0;
    
    const totalDecisions = manualStatsSum.signed + manualStatsSum.notSigned;
    const closingRate = totalDecisions > 0 ? (manualStatsSum.signed / totalDecisions) * 100 : 0;

    const appointmentRate = manualStatsSum.totalContacts > 0 ? (manualStatsSum.appointmentsTaken / manualStatsSum.totalContacts) * 100 : 0;
    const pickupRate = manualStatsSum.totalCalls > 0 ? (manualStatsSum.totalPickups / manualStatsSum.totalCalls) * 100 : 0;

    const totalSourceContacts = manualStatsSum.contactsDigital + manualStatsSum.contactsNonDigital;
    const digitalPercentage = totalSourceContacts > 0 ? (manualStatsSum.contactsDigital / totalSourceContacts) * 100 : 0;

    return {
      totalContacts: manualStatsSum.totalContacts,
      totalClients: activeClients,
      totalAdherents: activeAdherents,
      signatures: manualStatsSum.signed,
      appointmentsTaken: manualStatsSum.appointmentsTaken,
      appointmentSources: {
        prospect: manualStatsSum.appointmentsProspect,
        setter: manualStatsSum.appointmentsSetter
      },
      attendance: {
        showedUp: manualStatsSum.showedUp,
        noShow: manualStatsSum.noShow,
        cancelled: manualStatsSum.cancelled
      },
      conversions: {
        signed: manualStatsSum.signed,
        notSigned: manualStatsSum.notSigned
      },
      churnRate,
      totalRevenueTTC,
      totalRevenueHT,
      averageBasketTTC,
      averageBasketHT,
      showUpRate,
      closingRate,
      appointmentRate,
      pickupRate,
      totalCalls: manualStatsSum.totalCalls,
      totalPickups: manualStatsSum.totalPickups,
      contactsDigital: manualStatsSum.contactsDigital,
      contactsNonDigital: manualStatsSum.contactsNonDigital,
      digitalPercentage,
      dailyStats: [] // Simplified for now
    };
  }, [clients, formulas, manualStats, startDate, endDate]);
}
