import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkApril() {
  const uid = 'admin_user';
  
  const dailySnapshot = await getDocs(collection(db, 'dailyLogs'));
  const manualSnapshot = await getDocs(collection(db, 'manualStats'));

  let aprilDaily = 0;
  let aprilDailyCount = 0;
  dailySnapshot.forEach(doc => {
    const data = doc.data();
    if (data.uid === uid && data.date && data.date.startsWith('2026-04')) {
      const contacts = data.totalContacts !== undefined ? data.totalContacts : ((data.digital || 0) + (data.nonDigital || 0));
      aprilDaily += contacts;
      aprilDailyCount++;
      if (contacts > 0) {
        console.log(`- Saisie quotidienne du ${data.date} : ${contacts} contacts (Digital: ${data.digital}, Non-Digital: ${data.nonDigital})`);
      }
    }
  });

  let aprilManual = 0;
  let aprilManualCount = 0;
  manualSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.uid === uid && data.period_start && data.period_start.startsWith('2026-04')) {
      const contacts = data.totalContacts || 0;
      aprilManual += contacts;
      aprilManualCount++;
      if (contacts > 0) {
        console.log(`- Saisie additionnelle (${data.period_type}) du ${data.period_start} : ${contacts} contacts`);
      }
    }
  });

  console.log(`\n=== BILAN AVRIL 2026 ===`);
  console.log(`Contacts depuis saisies quotidiennes : ${aprilDaily} (dans ${aprilDailyCount} saisies)`);
  console.log(`Contacts depuis saisies additionnelles : ${aprilManual} (dans ${aprilManualCount} saisies)`);
  console.log(`TOTAL : ${aprilDaily + aprilManual}`);
  
  process.exit(0);
}

checkApril().catch(console.error);
