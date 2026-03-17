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
    
    let newMembersTotal = 0;
    let cancelledMembers = 0;
    let pausedMembers = 0;
    let regulariserMembers = 0;

    clients.forEach(c => {
      const currentStatus = c.status || (c.isActive ? 'ACTIVE' : 'RESILIE');
      
      if (c.formulaId) {
        totalSigned++;
        
        if (currentStatus === 'RESILIE') totalCancelled++;
        if (currentStatus === 'ACTIVE') activeAdherents++;
        if (currentStatus === 'EN_PAUSE') pausedMembers++;
        if (currentStatus === 'A_REGULARISER') regulariserMembers++;
        
        // Calculate new members and cancellations in the period
        const createdInPeriod = !startDate || !endDate || (c.createdAt >= startDate && c.createdAt <= endDate);
        if (createdInPeriod) {
          newMembersTotal++;
        }
        
        if (currentStatus === 'RESILIE' && c.deactivatedAt) {
          const deactivatedInPeriod = !startDate || !endDate || (c.deactivatedAt >= startDate && c.deactivatedAt <= endDate);
          if (deactivatedInPeriod) {
            cancelledMembers++;
          }
        }
      } else {
        if (currentStatus === 'ACTIVE') activeClients++;
      }
    });

    const newMembersNet = newMembersTotal - cancelledMembers;

    const churnRate = totalSigned > 0 ? (totalCancelled / totalSigned) * 100 : 0;
    const cancelledPercentage = totalSigned > 0 ? (totalCancelled / totalSigned) * 100 : 0;
    const pausedPercentage = totalSigned > 0 ? (pausedMembers / totalSigned) * 100 : 0;
    const regulariserPercentage = totalSigned > 0 ? (regulariserMembers / totalSigned) * 100 : 0;
    const totalAdherentsAndNonClients = activeAdherents + activeClients;

    // Average basket and total revenue
    let totalRevenueTTC = 0;
    let totalRevenueHT = 0;
    let totalRevenueNetTTC = 0;
    let totalRevenueNetHT = 0;
    let lostRevenueTTC = 0;
    let lostRevenueHT = 0;
    
    let sumMonthlyTTC = 0;
    let sumMonthlyHT = 0;
    let signedCount = 0;

    const periodStart = startDate ? new Date(startDate) : new Date(0);
    const periodEnd = endDate ? new Date(endDate) : new Date();

    clients.forEach(c => {
      if (c.formulaId) {
        const formula = formulas.find(f => f.id.toString() === c.formulaId?.toString());
        if (formula) {
          // Calculate monthly equivalent for average basket
          let monthlyTTC = formula.price;
          if (formula.period === 'week') monthlyTTC = formula.price * (52 / 12);
          if (formula.period === 'year') monthlyTTC = formula.price / 12;
          let monthlyHT = monthlyTTC / 1.2;

          // Calculate actual revenue generated in the period
          const clientStart = new Date(c.createdAt);
          const clientEnd = c.deactivatedAt ? new Date(c.deactivatedAt) : new Date();
          
          const overlapStart = new Date(Math.max(clientStart.getTime(), periodStart.getTime()));
          const overlapEnd = new Date(Math.min(clientEnd.getTime(), periodEnd.getTime()));

          if (overlapStart < overlapEnd) {
            const daysActive = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
            const dailyRateTTC = monthlyTTC / 30.436875;
            const dailyRateHT = monthlyHT / 30.436875;
            
            let priceTTC = daysActive * dailyRateTTC;
            let priceHT = daysActive * dailyRateHT;
            let netPriceTTC = priceTTC;
            let netPriceHT = priceHT;
            
            // Apply Alma commission for annual formulas if specified (commission is calculated on HT price)
            if (formula.period === 'year' && formula.almaCommission) {
              const commissionAmount = priceHT * (formula.almaCommission / 100);
              netPriceTTC = priceTTC - commissionAmount;
              netPriceHT = priceHT - commissionAmount;
            }
            
            totalRevenueTTC += priceTTC;
            totalRevenueHT += priceHT;
            totalRevenueNetTTC += netPriceTTC;
            totalRevenueNetHT += netPriceHT;
          }

          // Calculate lost revenue (MRR lost) for inactive clients
          const currentStatus = c.status || (c.isActive ? 'ACTIVE' : 'RESILIE');
          if (currentStatus !== 'ACTIVE' && c.deactivatedAt) {
            const deactivatedInPeriod = !startDate || !endDate || (c.deactivatedAt >= startDate && c.deactivatedAt <= endDate);
            if (deactivatedInPeriod) {
              lostRevenueTTC += monthlyTTC;
              lostRevenueHT += monthlyHT;
            }
          }

          // For average basket, only count clients who were active at some point in the period
          if (!startDate || !endDate || (c.createdAt <= endDate && (!c.deactivatedAt || c.deactivatedAt >= startDate))) {
            sumMonthlyTTC += monthlyTTC;
            sumMonthlyHT += monthlyHT;
            signedCount++;
          }
        }
      }
    });

    const averageBasketTTC = signedCount > 0 ? sumMonthlyTTC / signedCount : 0;
    const averageBasketHT = signedCount > 0 ? sumMonthlyHT / signedCount : 0;

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
      totalRevenueNetTTC,
      totalRevenueNetHT,
      lostRevenueTTC,
      lostRevenueHT,
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
      newMembersNet,
      newMembersTotal,
      cancelledMembers,
      totalCancelled,
      cancelledPercentage,
      pausedMembers,
      pausedPercentage,
      regulariserMembers,
      regulariserPercentage,
      totalAdherentsAndNonClients,
      totalDecisions,
      totalAppointments,
      dailyStats: [] // Simplified for now
    };
  }, [clients, formulas, manualStats, startDate, endDate]);
}
