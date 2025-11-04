

'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { adminAuth, adminDb, FieldValue } from '@/lib/firebase/admin';
import type {
  UserProfile,
  UserRole,
  Transaction,
  Bet,
  BetType,
  WithdrawalRequest,
  GameSettings,
  DepositRequest,
  LotteryResult,
  Lottery,
  BetTime,
} from '@/lib/types';

import { LOTTERIES } from '@/lib/constants';

/* -------------------------------------------
   Utilities
-------------------------------------------- */

const IST_TZ = 'Asia/Kolkata';

const nowIST = () =>
  new Date(new Date().toLocaleString('en-US', { timeZone: IST_TZ }));

const timeHHMM = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

const sumDigitsMod10 = (n3: string) =>
  (n3.split('').reduce((a, n) => a + Number(n), 0) % 10).toString();

const safeNumber = (v: any, fallback = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;

/* -------------------------------------------
   Auth Helper
-------------------------------------------- */

const getAuthorizedUser = async (
  authToken?: string
): Promise<{ uid: string; role: UserRole; email: string; customId: string } | null> => {
  const headerList = headers();
  const token = authToken || headerList.get('Authorization')?.split('Bearer ')[1];

  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return null;
    const profile = userDoc.data() as UserProfile;

    return {
      uid: decoded.uid,
      role: profile.role,
      email: profile.email,
      customId: profile.customId,
    };
  } catch (err) {
    console.error('Auth error:', err);
    return null;
  }
};

/* -------------------------------------------
   Game Settings
-------------------------------------------- */

export async function getGameSettings(): Promise<GameSettings> {
  const docRef = adminDb.collection('settings').doc('payoutRates');
  const doc = await docRef.get();
  if (!doc.exists) {
    // sensible defaults
    const defaults: GameSettings = {
      rates: {
        single_ank: 9.5,
        jodi: 95,
        single_panna: 150,
        double_panna: 300,
        triple_panna: 1000,
        starline: 9.5,
        half_sangam: 1000,
        full_sangam: 10000,
      },
      commission: 0.05,
    };
    return defaults;
  }
  const data = doc.data() as GameSettings;
  return {
    rates: data.rates,
    commission: safeNumber(data.commission, 0.05),
    upiId: data.upiId,
    qrCodeUrl: data.qrCodeUrl,
  };
};

/* -------------------------------------------
   Result Processing (Winners + Commissions)
-------------------------------------------- */

const processWinners = async (
  transaction: FirebaseFirestore.Transaction,
  lotteryName: string,
  resultType: 'open' | 'close',
  winningAnk: string,
  winningPanna: string,
  openClosePair?: { openAnk?: string; closeAnk?: string; openPanna?: string; closePanna?: string }
) => {
  const { rates } = await getGameSettings();

  // Prepare filters by resultType
  const checks: { type: BetType; time?: BetTime }[] = [
    { type: 'single_ank', time: resultType },
    { type: 'single_panna', time: resultType },
    { type: 'double_panna', time: resultType },
    { type: 'triple_panna', time: resultType },
    { type: 'starline' }, // Starline is checked on both open and close
  ];

  if (resultType === 'close') {
    checks.push({ type: 'jodi' }, { type: 'half_sangam' }, { type: 'full_sangam' });
  }

  for (const { type, time } of checks) {
    let q = adminDb
      .collection('bets')
      .where('lotteryName', '==', lotteryName)
      .where('status', '==', 'placed')
      .where('betType', '==', type);

    if (time) q = q.where('betTime', '==', time);

    const snap = await transaction.get(q);

    for (const betDoc of snap.docs) {
      const bet = betDoc.data() as Bet;
      let isWinner = false;

      // Derived winning values
      const openAnk = openClosePair?.openAnk;
      const closeAnk = openClosePair?.closeAnk;
      const openPanna = openClosePair?.openPanna;
      const closePanna = openClosePair?.closePanna;
      const winningJodi = openAnk && closeAnk ? `${openAnk}${closeAnk}` : undefined;

      switch (bet.betType) {
        case 'single_ank': {
          if (bet.numbers === winningAnk) isWinner = true;
          break;
        }
        case 'jodi': {
          if (resultType === 'close' && winningJodi && bet.numbers === winningJodi) {
            isWinner = true;
          }
          break;
        }
        case 'single_panna':
        case 'double_panna':
        case 'triple_panna': {
          if (bet.numbers === winningPanna) isWinner = true;
          break;
        }
        case 'half_sangam': {
          // Valid at close: either openPanna + closeAnk OR openAnk + closePanna (one digit)
          if (resultType === 'close' && openPanna && closeAnk && openAnk && closePanna) {
             const pattern1 = `${openPanna}${closeAnk}`; // Open Panna, Close Ank
             const pattern2 = `${openAnk}${closePanna}`; // Open Ank, Close Panna
            if (bet.numbers === pattern1 || bet.numbers === pattern2) {
              isWinner = true;
            }
          }
          break;
        }
        case 'full_sangam': {
          // Valid at close: openPanna + closePanna
          if (resultType === 'close' && openPanna && closePanna) {
            if (bet.numbers === `${openPanna}${closePanna}`) {
              isWinner = true;
            }
          }
          break;
        }
        case 'starline': {
          // Starline result is the single winning ank
          if (bet.numbers === winningAnk) isWinner = true;
          break;
        }
      }

      if (isWinner) {
        const rate = rates[bet.betType] ?? 0;
        const payout = bet.amount * rate;

        transaction.update(betDoc.ref, { status: 'won', payout });

        const userRef = adminDb.collection('users').doc(bet.userId);
        transaction.update(userRef, {
          walletBalance: FieldValue.increment(payout),
          cashBalance: FieldValue.increment(payout),
        });

        const txRef = adminDb.collection('transactions').doc();
        transaction.set(txRef, {
          fromId: 'game-pot',
          toId: bet.userId,
          toEmail: bet.userEmail,
          amount: payout,
          type: 'win',
          paymentType: 'cash',
          timestamp: new Date().toISOString(),
        } as Omit<Transaction, 'id'>);
      } else if (resultType === 'close' && (!time || time === 'close')) {
        // At close declaration, remaining close bets (and jodi/sangam) are settled as lost
        transaction.update(betDoc.ref, { status: 'lost' });
      }
    }
  }
};

const processCommissions = async (
  transaction: FirebaseFirestore.Transaction,
  lotteryName: string
) => {
  const { commission: globalCommissionRate } = await getGameSettings();

  const betsQuery = adminDb
    .collection('bets')
    .where('lotteryName', '==', lotteryName)
    .where('commissionProcessed', '!=', true);

  const betsSnap = await transaction.get(betsQuery);
  if (betsSnap.empty) return;

  const agentBetTotals: Record<string, number> = {}; // K: agentId, V: total bet amount

  for (const betDoc of betsSnap.docs) {
    const bet = betDoc.data() as Bet;
    if (bet.agentId) {
      agentBetTotals[bet.agentId] = (agentBetTotals[bet.agentId] || 0) + bet.amount;
    }
    // Mark as processed so we don't double-count in future runs
    transaction.update(betDoc.ref, { commissionProcessed: true });
  }

  for (const agentId of Object.keys(agentBetTotals)) {
    const agentRef = adminDb.collection('users').doc(agentId);
    const agentDoc = await transaction.get(agentRef);
    if (!agentDoc.exists) continue;

    const agentProfile = agentDoc.data() as UserProfile;
    const commissionRate = agentProfile.commissionRate ?? globalCommissionRate;

    if (commissionRate > 0) {
      const totalBets = agentBetTotals[agentId];
      const commissionAmount = totalBets * commissionRate;

      if (commissionAmount > 0) {
        transaction.update(agentRef, {
          walletBalance: FieldValue.increment(commissionAmount),
          cashBalance: FieldValue.increment(commissionAmount),
        });

        const commissionTxRef = adminDb.collection('transactions').doc();
        transaction.set(commissionTxRef, {
          fromId: 'admin',
          toId: agentId,
          toEmail: agentProfile.email,
          amount: commissionAmount,
          type: 'commission',
          paymentType: 'cash',
          timestamp: new Date().toISOString(),
        } as Omit<Transaction, 'id'>);
      }
    }
  }
};


/* -------------------------------------------
   Public Actions
-------------------------------------------- */

/** Sign-in (create profile if new) */
export async function handleSignIn(
  uid: string,
  email: string | null,
  name: string | null
): Promise<{ success: boolean; isNewUser: boolean; message: string }> {
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    if (doc.exists) {
      return { success: true, isNewUser: false, message: 'Logged in successfully!' };
    }

    const profile: Omit<UserProfile, 'uid'> = {
      name: name || 'Lucky Player',
      email: email || '',
      role: 'user',
      customId: `C${Math.random().toString().substring(2, 8)}`,
      createdAt: new Date().toISOString(),
      disabled: false,
      walletBalance: 100,
      cashBalance: 100,
      creditBalance: 0,
    };

    await userRef.set(profile);

    const txRef = adminDb.collection('transactions').doc();
    await txRef.set({
      fromId: 'admin',
      fromEmail: 'System',
      toId: uid,
      toEmail: email || '',
      amount: 100,
      type: 'deposit',
      paymentType: 'cash',
      timestamp: new Date().toISOString(),
    } as Omit<Transaction, 'id'>);

    return { success: true, isNewUser: true, message: 'Welcome! Bonus credited.' };
  } catch (err) {
    console.error('handleSignIn error:', err);
    return { success: false, isNewUser: false, message: 'Server error during sign-in.' };
  }
}

/** Place a bet */
export async function placeBet(betDetails: {
  authToken: string;
  userId?: string; // Optional: For admin to specify user
  lotteryName: string;
  betType: BetType;
  numbers: string;
  amount: number;
  betTime?: 'open' | 'close';
}): Promise<{ success: boolean; message: string }> {
  const { authToken, userId, lotteryName, betType, numbers, amount, betTime } = betDetails;

  if (!amount || typeof amount !== 'number' || amount <= 0)
    return { success: false, message: 'Invalid bet amount.' };
  if (!numbers || typeof numbers !== 'string')
    return { success: false, message: 'Invalid numbers.' };

  const rules: Record<BetType, number> = {
    single_ank: 1,
    jodi: 2,
    single_panna: 3,
    double_panna: 3,
    triple_panna: 3,
    starline: 1,
    half_sangam: 4,
    full_sangam: 6,
  };
  if (numbers.length !== rules[betType])
    return {
      success: false,
      message: `Invalid numbers length for ${betType}. Expected ${rules[betType]} digits.`,
    };

  const adminUser = await getAuthorizedUser(authToken);
  if (!adminUser) return { success: false, message: 'Unauthorized.' };
  
  let targetUserId = adminUser.uid;

  // If admin is placing a bet for another user
  if (userId && adminUser.role === 'admin') {
      targetUserId = userId;
  } else if (userId && adminUser.uid !== userId) {
      return { success: false, message: 'You can only place bets for yourself.' };
  }


  const userRef = adminDb.collection('users').doc(targetUserId);
  const lotteryRef = adminDb.collection('lotteries').doc(lotteryName);

  try {
    const res = await adminDb.runTransaction(async (tx) => {
      const [userDoc, lotteryDoc] = await Promise.all([
        tx.get(userRef),
        tx.get(lotteryRef),
      ]);

      if (!userDoc.exists) return { success: false, message: 'User not found.' };
      if (!lotteryDoc.exists) return { success: false, message: 'Game not found.' };

      const profile = userDoc.data() as UserProfile;
      const lottery = lotteryDoc.data() as Lottery;

      // account checks
      if (profile.disabled) return { success: false, message: 'User account is disabled.' };
      if (profile.walletLimit != null && (profile.walletBalance + 0) > profile.walletLimit)
        return { success: false, message: `Wallet limit ${profile.walletLimit} reached.` };

      // market checks
      const now = nowIST();
      const hhmm = timeHHMM(now);

      if (lottery.openTime && lottery.closeTime) {
        // jodi/half/full sangam only before open
        const isBeforeOpen = hhmm < lottery.openTime;
        const isBeforeClose = hhmm < lottery.closeTime;

        if (['jodi', 'half_sangam', 'full_sangam'].includes(betType)) {
          if (!isBeforeOpen)
            return { success: false, message: 'Betting closed for this market.' };
        } else if (betTime === 'open') {
          if (!isBeforeOpen) return { success: false, message: 'Open market closed.' };
        } else if (betTime === 'close') {
          if (!isBeforeClose) return { success: false, message: 'Close market closed.' };
        }
      }

      // balance check
      if (profile.walletBalance < amount)
        return { success: false, message: 'Insufficient balance.' };

      // deduct
      tx.update(userRef, { walletBalance: FieldValue.increment(-amount) });

      // write bet
      const betRef = adminDb.collection('bets').doc();
      const betData: Omit<Bet, 'id'> = {
        userId: targetUserId,
        userEmail: profile.email,
        agentId: profile.agentId,
        lotteryName,
        betType,
        betTime,
        numbers,
        amount,
        createdAt: new Date().toISOString(),
        status: 'placed',
        commissionProcessed: false,
      };
      tx.set(betRef, betData);

      // transaction record
      const trxRef = adminDb.collection('transactions').doc();
      tx.set(trxRef, {
        fromId: targetUserId,
        fromEmail: profile.email,
        toId: 'game-pot',
        toEmail: 'Game Pot',
        amount,
        type: 'bet',
        paymentType: 'cash',
        timestamp: new Date().toISOString(),
      } as Omit<Transaction, 'id'>);
      
      return { success: true, message: 'Bet placed successfully!' };
    });

    return res;
  } catch (err) {
    console.error('placeBet error:', err);
    return { success: false, message: 'Failed to place bet.' };
  }
}

/** Declare result (manual) — saves result + settles winners + commissions */
export async function declareResultManually(
  lotteryName: string,
  resultType: 'open' | 'close',
  panna: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Basic validation
    if (!lotteryName) return { success: false, message: 'Select a lottery.' };
    if (!/^\d{3}$/.test(panna)) return { success: false, message: 'Panna must be 3 digits.' };

    const ank = sumDigitsMod10(panna);

    // Read current result doc to know open/close pair
    const resultRef = adminDb.collection('results').doc(lotteryName);
    const resultDoc = await resultRef.get();

    // Compute new values
    let openPanna: string | undefined;
    let openAnk: string | undefined;
    let closePanna: string | undefined;
    let closeAnk: string | undefined;

    if (resultDoc.exists) {
      const r = resultDoc.data() as LotteryResult;
      openPanna = r.openPanna;
      openAnk = r.openAnk;
      closePanna = r.closePanna;
      closeAnk = r.closeAnk;
    }

    if (resultType === 'open') {
      openPanna = panna;
      openAnk = ank;
    } else {
      closePanna = panna;
      closeAnk = ank;
    }

    const status: LotteryResult['status'] = resultType === 'open' ? 'open' : 'closed';
    const jodi = openAnk && closeAnk ? `${openAnk}${closeAnk}` : undefined;
    const fullResult =
      openPanna && openAnk && closePanna ? `${openPanna}-${openAnk}-${closePanna}` : undefined;

    // Save/Update result
    if (!resultDoc.exists) {
      await resultRef.set({
        lotteryName,
        drawDate: new Date().toISOString(),
        openPanna: openPanna || '',
        openAnk: openAnk || '',
        closePanna: closePanna || '',
        closeAnk: closeAnk || '',
        jodi: jodi || '',
        fullResult: fullResult || '',
        status,
        source: 'manual',
      } as LotteryResult);
    } else {
      await resultRef.update({
        openPanna: openPanna || '',
        openAnk: openAnk || '',
        closePanna: closePanna || '',
        closeAnk: closeAnk || '',
        jodi: jodi || '',
        fullResult: fullResult || '',
        status,
        source: 'manual',
        drawDate: new Date().toISOString(),
      } as Partial<LotteryResult>);
    }

    // Settle winners + commissions inside transaction
    await adminDb.runTransaction(async (tx) => {
      await processWinners(tx, lotteryName, resultType, ank, panna, {
        openAnk,
        closeAnk,
        openPanna,
        closePanna,
      });

      if (resultType === 'close') {
        await processCommissions(tx, lotteryName);
      }
    });

    // Optional: revalidate admin results page (if using caching)
    revalidatePath('/admin/results');

    return { success: true, message: `Result declared for ${lotteryName}.` };
  } catch (err) {
    console.error('declareResultManually error:', err);
    return { success: false, message: 'Failed to declare result.' };
  }
}

/** Historical results */
export async function getHistoricalResults(gameName: string): Promise<LotteryResult[]> {
  const snap = await adminDb
    .collection('historical_results')
    .where('lotteryName', '==', gameName)
    .orderBy('drawDate', 'desc')
    .limit(100)
    .get();

  return snap.docs.map((d) => d.data() as LotteryResult);
}

/** List games (from collection; fallback to constants) */
export async function listLotteryGames(): Promise<Lottery[]> {
  try {
    const snap = await adminDb.collection('lotteries').get();
    if (snap.empty) return LOTTERIES as Lottery[];
    const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Lottery) }));
    // normalize optional times as string|null
    return arr.map((g) => ({
      ...g,
      openTime: g.openTime ?? null,
      closeTime: g.closeTime ?? null,
    }));
  } catch (error) {
    console.warn("Failed to fetch lottery games from Firestore, falling back to local constants. Error:", error);
    return LOTTERIES as Lottery[];
  }
}

/** Dashboard stats (admin / agent) */
export async function getDashboardStats(agentId?: string): Promise<any> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser) return { success: false, message: 'Unauthorized' };

    try {
        let targetAgentId = agentId;
        // If an agent calls this for themselves, use their own UID.
        if (currentUser.role === 'agent' && !targetAgentId) {
            targetAgentId = currentUser.uid;
        }

        // Logic for an agent's report (can be called by admin for other agent, or agent for themselves)
        if (targetAgentId && (currentUser.role === 'admin' || (currentUser.role === 'agent' && currentUser.uid === targetAgentId))) {
            const agentDoc = await adminDb.collection('users').doc(targetAgentId).get();
            if (!agentDoc.exists || agentDoc.data()?.role !== 'agent') {
                 return { success: false, message: 'Agent not found.' };
            }

            const agentData = { uid: agentDoc.id, ...agentDoc.data() } as UserProfile;
            const usersSnap = await adminDb.collection('users').where('agentId', '==', targetAgentId).get();
            const userIds = usersSnap.docs.map(doc => doc.id);

            let totalBetAmount = 0;
            let totalCommission = 0;
            const userBetCounts: Record<string, { email: string, name: string, count: number, amount: number }> = {};

            if (userIds.length > 0) {
                // Firestore 'in' queries are limited to 30 elements. If an agent has more users, this needs chunking.
                // For now, assuming agent has < 30 users for simplicity.
                const betsSnap = await adminDb.collection('bets').where('userId', 'in', userIds).get();
                betsSnap.forEach(doc => {
                    const bet = doc.data() as Bet;
                    totalBetAmount += safeNumber(bet.amount);
                    if (!userBetCounts[bet.userId]) {
                        userBetCounts[bet.userId] = { email: bet.userEmail, name: '', count: 0, amount: 0 };
                    }
                    userBetCounts[bet.userId].count++;
                    userBetCounts[bet.userId].amount += bet.amount;
                });
            }

            const commSnap = await adminDb.collection('transactions').where('toId', '==', targetAgentId).where('type', '==', 'commission').get();
            commSnap.forEach(doc => {
                totalCommission += safeNumber(doc.data().amount);
            });
            
            const activeUsersList = Object.entries(userBetCounts)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 10)
                .map(([userId, data]) => {
                     const userFromList = usersSnap.docs.find(d => d.id === userId)?.data() as UserProfile | undefined;
                     return { ...data, name: userFromList?.name || 'Unknown' };
                });

            // If an agent is calling for themselves, return a simplified view
            if (currentUser.role === 'agent') {
                return {
                    success: true,
                    stats: {
                        totalUsers: usersSnap.size,
                        totalBets: userBetCounts ? Object.values(userBetCounts).reduce((acc, user) => acc + user.count, 0) : 0,
                        totalCommission: totalCommission,
                    }
                };
            }

            // Full report for admin view
            return {
                success: true,
                stats: {
                    agent: agentData,
                    totalUsers: usersSnap.size,
                    totalBetVolume: totalBetAmount,
                    totalCommission,
                    activeUsers: activeUsersList,
                }
            };
        }
        
        // Admin's main dashboard
        if (currentUser.role === 'admin') {
            const usersSnap = await adminDb.collection('users').where('role', '==', 'user').get();
            const agentsSnap = await adminDb.collection('users').where('role', '==', 'agent').get();
            const betsSnap = await adminDb.collection('bets').get();
            const depositSnap = await adminDb.collection('deposits').where('status', '==', 'pending').get();
            const withdrawSnap = await adminDb.collection('withdrawals').where('status', '==', 'pending').get();

            let totalRevenue = 0;
            const gameRevenue: Record<string, number> = {};
            const gameCounts: Record<string, number> = {};
            
            betsSnap.forEach(doc => {
                const bet = doc.data() as Bet;
                totalRevenue += safeNumber(bet.amount);
                gameRevenue[bet.lotteryName] = (gameRevenue[bet.lotteryName] || 0) + bet.amount;
                gameCounts[bet.lotteryName] = (gameCounts[bet.lotteryName] || 0) + 1;
            });

            const commSnap = await adminDb.collection('transactions').where('type', '==', 'commission').get();
            const agentCommissions: Record<string, number> = {};
            commSnap.forEach(doc => {
                const tx = doc.data() as Transaction;
                agentCommissions[tx.toId] = (agentCommissions[tx.toId] || 0) + tx.amount;
            });
            
            const topAgentEntry = Object.entries(agentCommissions).sort((a, b) => b[1] - a[1])[0];
            let topAgentInfo = { name: 'N/A', commission: 0 };

            if(topAgentEntry) {
                const [topAgentId, topCommission] = topAgentEntry;
                const agentDoc = await adminDb.collection('users').doc(topAgentId).get();
                if(agentDoc.exists) {
                    topAgentInfo = { name: (agentDoc.data() as UserProfile).customId, commission: topCommission };
                }
            }

            return {
                success: true,
                stats: {
                    totalUsers: usersSnap.size,
                    totalAgents: agentsSnap.size,
                    totalBets: betsSnap.size,
                    totalRevenue: totalRevenue,
                    pendingDeposits: depositSnap.size,
                    pendingWithdrawals: withdrawSnap.size,
                    mostPlayedGame: Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
                    highestRevenueGame: Object.entries(gameRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
                    topPerformingAgent: topAgentInfo.name,
                    topAgentCommission: topAgentInfo.commission
                }
            };
        }

        return { success: false, message: 'No stats available for this role.' };
    } catch (err: any) {
        console.error('getDashboardStats error:', err);
        return { success: false, message: err.message || 'Server error fetching stats.' };
    }
}


/** Admin: list users by role */
export async function listUsers(role: UserRole): Promise<UserProfile[]> {
  const currentUser = await getAuthorizedUser();
  if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) return [];
  const snap = await adminDb.collection('users').where('role', '==', role).get();
  return snap.docs.map((d) => {
    const data = d.data() as UserProfile;
    return { ...data, uid: d.id };
  });
}

/** Admin: list all users (for bet placement) */
export async function listAllUsers(): Promise<UserProfile[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') return [];
    const snap = await adminDb.collection('users').get();
    return snap.docs.map((d) => {
        const data = d.data() as UserProfile;
        return { ...data, uid: d.id };
    });
}


/** Agent: list own users */
export async function listAgentUsers(agentId: string): Promise<UserProfile[]> {
  const currentUser = await getAuthorizedUser();
  if (!currentUser || currentUser.role !== 'agent' || currentUser.uid !== agentId) return [];
  const snap = await adminDb.collection('users').where('agentId', '==', agentId).get();
  return snap.docs.map((d) => {
    const data = d.data() as UserProfile;
    return { ...data, uid: d.id };
  });
}

/** Enable/Disable user */
export async function updateUserStatus(
  uid: string,
  disabled: boolean
): Promise<{ success: boolean; message: string }> {
  const currentUser = await getAuthorizedUser();
  if (!currentUser || !['admin', 'agent'].includes(currentUser.role))
    return { success: false, message: 'Unauthorized.' };

  try {
    await adminAuth.updateUser(uid, { disabled });
    await adminDb.collection('users').doc(uid).update({ disabled });
    return { success: true, message: `User ${disabled ? 'disabled' : 'enabled'} successfully.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update user status.' };
  }
}

/** Delete user */
export async function deleteUser(uid: string): Promise<{ success: boolean; message: string }> {
  const currentUser = await getAuthorizedUser();
  if (!currentUser || !['admin', 'agent'].includes(currentUser.role))
    return { success: false, message: 'Unauthorized.' };

  try {
    await adminDb.collection('users').doc(uid).delete();
    await adminAuth.deleteUser(uid);
    return { success: true, message: 'User deleted successfully.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete user.' };
  }
}

/** Create user (admin) */
export async function createUser(
  name: string,
  email: string,
  password?: string,
  mobile?: string,
  agentUid?: string | 'no-agent'
): Promise<{ success: boolean; message: string }> {
  const currentUser = await getAuthorizedUser();
  if (!currentUser || !['admin', 'agent'].includes(currentUser.role))
    return { success: false, message: 'Unauthorized.' };

  try {
    const userRecord = await adminAuth.createUser({
      email: email,
      emailVerified: false,
      password: password || Math.random().toString(36).slice(-10),
      displayName: name,
      disabled: false,
    });

    let agentData: UserProfile | null = null;
    let finalAgentUid: string | undefined = agentUid;
    
    // If agent is creating, force their ID.
    if (currentUser.role === 'agent') {
        finalAgentUid = currentUser.uid;
    }

    if (finalAgentUid && finalAgentUid !== 'no-agent') {
        const agentDoc = await adminDb.collection('users').doc(finalAgentUid).get();
        if(agentDoc.exists) {
            agentData = {uid: agentDoc.id, ...agentDoc.data()} as UserProfile
        }
    }
   

    const profile: Omit<UserProfile, 'uid'> = {
      name: name,
      email: email,
      role: 'user',
      customId: `C${Math.random().toString().substring(2, 8)}`,
      createdAt: new Date().toISOString(),
      disabled: false,
      agentId: agentData?.uid,
      agentCustomId: agentData?.customId,
      walletBalance: 0,
      cashBalance: 0,
      creditBalance: 0,
      mobile: mobile || '',
    };

    await adminDb.collection('users').doc(userRecord.uid).set(profile);

    return { success: true, message: 'User created successfully.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to create user.' };
  }
}


/* -------------------------------------------
   Deposit & Withdrawal
-------------------------------------------- */

export async function listDepositRequests(): Promise<DepositRequest[]> {
  const snap = await adminDb
    .collection('deposits')
    .orderBy('requestedAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DepositRequest, 'id'>) }));
}

export async function listWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const snap = await adminDb
    .collection('withdrawals')
    .orderBy('requestedAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) }));
}

export async function createDepositRequest(
  amount: number,
  transactionId: string
): Promise<{ success: boolean; message: string }> {
  const user = await getAuthorizedUser();
  if (!user) return { success: false, message: 'You must be logged in.' };
  
  const userDoc = await adminDb.collection('users').doc(user.uid).get();
  if(!userDoc.exists) return { success: false, message: 'User profile not found.' };
  const userProfile = userDoc.data() as UserProfile;

  const request: Omit<DepositRequest, 'id'> = {
    userId: user.uid,
    userEmail: user.email,
    userName: userProfile.name,
    agentId: userProfile.agentId,
    amount,
    transactionId,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  await adminDb.collection('deposits').add(request);
  return { success: true, message: 'Deposit request submitted successfully! It will be reviewed by an admin.' };
}

export async function createWithdrawalRequest(
  amount: number
): Promise<{ success: boolean; message: string }> {
  const user = await getAuthorizedUser();
  if (!user) return { success: false, message: 'You must be logged in.' };

  const userRef = adminDb.collection('users').doc(user.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return { success: false, message: 'User profile not found.' };
  const userProfile = userDoc.data() as UserProfile;

  if (!userProfile.upiId) {
    return { success: false, message: 'Please add a UPI ID to your profile before requesting a withdrawal.' };
  }
   if (amount > userProfile.cashBalance) {
    return { success: false, message: 'Withdrawal amount cannot exceed your cash balance.' };
  }

  // Deduct from wallet immediately
  await userRef.update({
    walletBalance: FieldValue.increment(-amount),
    cashBalance: FieldValue.increment(-amount),
  });

  const request: Omit<WithdrawalRequest, 'id'> = {
    userId: user.uid,
    userEmail: user.email,
    userName: userProfile.name,
    userUpiId: userProfile.upiId,
    agentId: userProfile.agentId,
    amount,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  await adminDb.collection('withdrawals').add(request);
  
  return { success: true, message: 'Withdrawal request submitted! Amount will be processed shortly.' };
}


export async function processDepositRequest(
  requestId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') return { success: false, message: 'Unauthorized.' };
    
    const reqRef = adminDb.collection('deposits').doc(requestId);
    
    try {
        const result = await adminDb.runTransaction(async (tx) => {
            const reqDoc = await tx.get(reqRef);
            if (!reqDoc.exists) throw new Error('Request not found.');
            
            const req = reqDoc.data() as DepositRequest;
            if (req.status !== 'pending') throw new Error(`Request is already ${req.status}.`);

            const userRef = adminDb.collection('users').doc(req.userId);
            
            if (action === 'approve') {
                tx.update(userRef, {
                    walletBalance: FieldValue.increment(req.amount),
                    cashBalance: FieldValue.increment(req.amount),
                });
                
                tx.update(reqRef, {
                    status: 'approved',
                    processedAt: new Date().toISOString(),
                    processedBy: currentUser.uid,
                });
                return { success: true, message: 'Deposit approved and funds added to user wallet.' };
            } else { // reject
                tx.update(reqRef, {
                    status: 'rejected',
                    processedAt: new Date().toISOString(),
                    processedBy: currentUser.uid,
                });
                return { success: true, message: 'Deposit request has been rejected.' };
            }
        });
        return result;
    } catch(err: any) {
        console.error('processDepositRequest error:', err);
        return { success: false, message: err.message || 'Server error while processing request.' };
    }
}


export async function processWithdrawalRequest(
  requestId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; message: string }> {
  try {
    const reqRef = adminDb.collection('withdrawals').doc(requestId);
    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) {
      return { success: false, message: 'Request not found.' };
    }

    const req = reqDoc.data() as WithdrawalRequest;
    const userRef = adminDb.collection('users').doc(req.userId);

    if (action === 'approve') {
      await reqRef.update({
        status: 'approved',
        processedAt: new Date().toISOString(),
      });

      return { success: true, message: 'Withdrawal approved ✅' };
    }

    if (action === 'reject') {
      await adminDb.runTransaction(async (tx) => {
        // This refunds the amount deducted at the time of request
        tx.update(userRef, {
          walletBalance: FieldValue.increment(req.amount),
          cashBalance: FieldValue.increment(req.amount),
        });
        tx.update(reqRef, {
          status: 'rejected',
          processedAt: new Date().toISOString(),
        });
      });

      return { success: true, message: 'Withdrawal rejected & amount refunded ❌' };
    }

    return { success: false, message: 'Invalid action.' };
  } catch (err) {
    console.error('processWithdrawalRequest error:', err);
    return { success: false, message: 'Server error while processing request.' };
  }
}

/** Update user's agent (using agent UID; pass 'no-agent' to clear) */
export async function updateUserAgent(
  uid: string,
  agentUid: string | 'no-agent'
): Promise<{ success: boolean; message: string }> {
  const currentUser = await getAuthorizedUser();
  if (!currentUser || currentUser.role !== 'admin')
    return { success: false, message: 'Unauthorized.' };

  try {
    if (agentUid === 'no-agent') {
      await adminDb.collection('users').doc(uid).update({
        agentId: FieldValue.delete(),
        agentCustomId: FieldValue.delete(),
      });
      return { success: true, message: 'Agent removed from user.' };
    }

    const agentDoc = await adminDb.collection('users').doc(agentUid).get();

    if (!agentDoc.exists || agentDoc.data()?.role !== 'agent') {
      return { success: false, message: 'Agent not found.' };
    }

    const agentData = agentDoc.data() as UserProfile;
    await adminDb.collection('users').doc(uid).update({
      agentId: agentDoc.id,
      agentCustomId: agentData.customId,
    });

    return { success: true, message: 'Agent assigned successfully.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update agent.' };
  }
}

/** Adjust wallet (admin/agent) */
export async function updateWalletBalance(
    uid: string,
    amount: number, // positive to add, negative to remove
    type: 'cash' | 'credit'
): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
        return { success: false, message: 'Unauthorized.' };
    }

    try {
        const userRef = adminDb.collection('users').doc(uid);
        
        const res = await adminDb.runTransaction(async tx => {
            const userDoc = await tx.get(userRef);
            if (!userDoc.exists) throw new Error('User not found.');
            const user = userDoc.data() as UserProfile;

            // Agent can't modify another agent's or admin's wallet
            if(currentUser.role === 'agent' && (user.role === 'agent' || user.role === 'admin')) {
                throw new Error('Agents cannot modify wallets of other agents or admins.');
            }
            // Agent can only manage users assigned to them
            if (currentUser.role === 'agent' && user.agentId !== currentUser.uid) {
                throw new Error('You can only manage users assigned to you.');
            }

            const updates: { [key: string]: any } = {
                walletBalance: FieldValue.increment(amount)
            };
            if (type === 'cash') {
                updates.cashBalance = FieldValue.increment(amount);
            } else { // credit
                updates.creditBalance = FieldValue.increment(amount);
            }

            tx.update(userRef, updates);
            
            const txType = amount > 0 ? 'deposit' : 'withdrawal';
            const txData: Omit<Transaction, 'id'> = {
                fromId: amount > 0 ? currentUser.uid : uid,
                fromEmail: currentUser.email,
                toId: amount > 0 ? uid : currentUser.uid,
                toEmail: user.email,
                amount: Math.abs(amount),
                type: txType,
                paymentType: type,
                timestamp: new Date().toISOString(),
            };
            const newTxRef = adminDb.collection('transactions').doc();
            tx.set(newTxRef, txData);
            
            return { success: true, message: `Wallet updated successfully.` };
        });
        
        return res;

    } catch (err: any) {
        return { success: false, message: err.message || 'Failed to update wallet.' };
    }
}


/** Set wallet limit (admin) */
export async function updateWalletLimit(
  uid: string,
  walletLimit: number | null,
): Promise<{ success: boolean; message: string }> {
  const currentUser = await getAuthorizedUser();
  if (!currentUser || !['admin', 'agent'].includes(currentUser.role))
    return { success: false, message: 'Unauthorized.' };
    
  // Added security: Agent can only set limit for their own users
  if(currentUser.role === 'agent') {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if(!userDoc.exists || userDoc.data()?.agentId !== currentUser.uid) {
          return { success: false, message: 'You can only set limits for your assigned users.'}
      }
  }

  try {
    await adminDb.collection('users').doc(uid).update({
      walletLimit: walletLimit,
    });
    return { success: true, message: 'Wallet limit updated.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to set wallet limit.' };
  }
}

/** Update user profile details */
export async function updateUserProfile(uid: string, name: string, mobile: string, upiId: string): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.uid !== uid) {
        return { success: false, message: 'Unauthorized.' };
    }

    try {
        await adminDb.collection('users').doc(uid).update({
            name,
            mobile,
            upiId
        });
        return { success: true, message: 'Profile updated successfully!' };
    } catch(err: any) {
        return { success: false, message: err.message || 'Failed to update profile.' };
    }
}

export async function createAdmin(email: string): Promise<{ success: boolean, message: string }> {
    try {
        const user = await adminAuth.getUserByEmail(email);
        await adminAuth.setCustomUserClaims(user.uid, { role: 'admin' });
        await adminDb.collection('users').doc(user.uid).set({
            role: 'admin'
        }, { merge: true });
        
        return { success: true, message: `Successfully promoted ${email} to admin. Please ask them to log in again.` };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return { success: false, message: 'User with this email not found. Please register the user first.' };
        }
        return { success: false, message: error.message };
    }
}

export async function createAgent(name: string, email: string, mobile: string, password?: string): Promise<{ success: boolean, message: string }> {
     const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: 'Unauthorized.' };
    }

    try {
         const userRecord = await adminAuth.createUser({
            email,
            emailVerified: false,
            password: password || Math.random().toString(36).slice(-8),
            displayName: name,
            disabled: false,
        });

        await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'agent' });
        
        const agentId = `A${Math.random().toString().substring(2, 8)}`;

        const profile: Omit<UserProfile, 'uid'> = {
            name: name,
            email: email,
            role: 'agent',
            customId: agentId,
            createdAt: new Date().toISOString(),
            disabled: false,
            walletBalance: 0,
            cashBalance: 0,
            creditBalance: 0,
            mobile: mobile,
        };

        await adminDb.collection('users').doc(userRecord.uid).set(profile);
        
        return { success: true, message: `Agent ${name} created with ID ${agentId}.` };
    } catch(err: any) {
        return { success: false, message: err.message || "Failed to create agent." };
    }
}

export async function listBets(userId?: string, agentId?: string): Promise<Bet[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser) return [];

    let query: FirebaseFirestore.Query = adminDb.collection('bets');

    if (userId && currentUser.uid === userId) {
        query = query.where('userId', '==', userId);
    } else if (agentId && currentUser.uid === agentId && currentUser.role === 'agent') {
        query = query.where('agentId', '==', agentId);
    } else if (currentUser.role === 'admin') {
        // Admin can see all bets, no filter needed unless specified
        if(userId) query = query.where('userId', '==', userId);
        if(agentId) query = query.where('agentId', '==', agentId);
    } else {
        return []; // Not authorized to see this data
    }
    
    const snap = await query.orderBy('createdAt', 'desc').limit(100).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
}

export async function listTransactions(userId: string, role: UserRole): Promise<Transaction[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser) return [];

    let query: FirebaseFirestore.Query = adminDb.collection('transactions');
    
    if (role === 'user' && currentUser.uid === userId) {
        // A user can see transactions where they are either the sender or receiver
        const sentQ = adminDb.collection('transactions').where('fromId', '==', userId);
        const receivedQ = adminDb.collection('transactions').where('toId', '==', userId);
        
        const [sentSnap, receivedSnap] = await Promise.all([sentQ.get(), receivedQ.get()]);
        
        const txMap = new Map<string, Transaction>();
        sentSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data()} as Transaction));
        receivedSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data()} as Transaction));

        return Array.from(txMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    } else if (role === 'agent' && currentUser.uid === userId) {
        const sentQ = adminDb.collection('transactions').where('fromId', '==', userId);
        const receivedQ = adminDb.collection('transactions').where('toId', '==', userId);
        
        const [sentSnap, receivedSnap] = await Promise.all([sentQ.get(), receivedQ.get()]);
        
        const txMap = new Map<string, Transaction>();
        sentSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data()} as Transaction));
        receivedSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data()} as Transaction));

        return Array.from(txMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
     else if(role === 'admin' && currentUser.role === 'admin') {
        const snap = await query.orderBy('timestamp', 'desc').limit(200).get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    }

    return [];
}


// --- Game Management (for Settings page) ---
export async function createLotteryGame(authToken: string, game: Omit<Lottery, 'id'>): Promise<{ success: boolean, message: string }> {
    const user = await getAuthorizedUser(authToken);
    if (!user || user.role !== 'admin') return { success: false, message: 'Unauthorized' };

    try {
        await adminDb.collection('lotteries').doc(game.name).set(game);
        revalidatePath('/admin/settings');
        return { success: true, message: `Game '${game.name}' created.` };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteLotteryGame(authToken: string, gameId: string): Promise<{ success: boolean, message: string }> {
     const user = await getAuthorizedUser(authToken);
    if (!user || user.role !== 'admin') return { success: false, message: 'Unauthorized' };
    
    try {
        await adminDb.collection('lotteries').doc(gameId).delete();
        revalidatePath('/admin/settings');
        return { success: true, message: `Game '${gameId}' deleted.` };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function updateLotteryGameTimes(authToken: string, gameId: string, openTime: string | null, closeTime: string | null): Promise<{ success: boolean, message: string }> {
    const user = await getAuthorizedUser(authToken);
    if (!user || user.role !== 'admin') return { success: false, message: 'Unauthorized' };

    try {
        await adminDb.collection('lotteries').doc(gameId).update({ openTime, closeTime });
        revalidatePath('/admin/settings');
        return { success: true, message: `Timings for '${gameId}' updated.` };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function updateGameSettings(
    rates: Record<BetType, number>,
    commission: number,
    upiId: string,
    qrCodeUrl: string
): Promise<{ success: boolean, message: string }> {
     const user = await getAuthorizedUser();
    if (!user || user.role !== 'admin') return { success: false, message: 'Unauthorized' };

    try {
        const settings: GameSettings = { rates, commission, upiId, qrCodeUrl };
        await adminDb.collection('settings').doc('payoutRates').set(settings, { merge: true });
        return { success: true, message: 'Game settings updated successfully.' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function processBankStatement(csvContent: string): Promise<{ success: boolean, message: string }> {
    const user = await getAuthorizedUser();
    if (!user || user.role !== 'admin') return { success: false, message: 'Unauthorized.' };
    
    // Simple parsing, assuming "Transaction ID,Amount" format
    // This should be made more robust based on the actual CSV format
    const lines = csvContent.split('\n').slice(1); // Skip header
    let approvedCount = 0;
    let failedCount = 0;

    for (const line of lines) {
        if (!line.trim()) continue;
        const [txnId, amountStr] = line.split(',');
        if (!txnId || !amountStr) {
            failedCount++;
            continue;
        };
        
        const amount = parseFloat(amountStr.trim());
        const cleanTxnId = txnId.trim();

        if (isNaN(amount) || amount <= 0) {
            failedCount++;
            continue;
        }
        
        try {
            const depositQuery = await adminDb.collection('deposits')
                .where('transactionId', '==', cleanTxnId)
                .where('amount', '==', amount)
                .where('status', '==', 'pending')
                .limit(1)
                .get();

            if (!depositQuery.empty) {
                const depositDoc = depositQuery.docs[0];
                const approveResult = await processDepositRequest(depositDoc.id, 'approve');
                if (approveResult.success) {
                    approvedCount++;
                } else {
                    failedCount++;
                }
            } else {
                failedCount++;
            }
        } catch(e) {
            console.error(`Error processing line: ${line}`, e);
            failedCount++;
        }
    }

    return { success: true, message: `Processing complete. Approved: ${approvedCount}. Failed/Not Found: ${failedCount}.` };
}

/** Admin: Set a custom commission rate for an agent */
export async function updateAgentCommission(
    uid: string,
    commissionRate: number | null
): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: 'Unauthorized.' };
    }

    try {
        const agentRef = adminDb.collection('users').doc(uid);
        const agentDoc = await agentRef.get();
        if (!agentDoc.exists || agentDoc.data()?.role !== 'agent') {
            return { success: false, message: 'Agent not found.' };
        }

        if (commissionRate === null) {
            // Remove the custom rate, fallback to global
            await agentRef.update({
                commissionRate: FieldValue.delete()
            });
             return { success: true, message: "Custom commission removed. Agent will now use the global rate." };
        }

        if (commissionRate < 0 || commissionRate > 1) {
            return { success: false, message: 'Commission rate must be between 0 (0%) and 1 (100%).' };
        }

        await agentRef.update({
            commissionRate: commissionRate
        });

        return { success: true, message: `Agent commission updated to ${commissionRate * 100}%.` };

    } catch (err: any) {
        return { success: false, message: err.message || 'Failed to update commission rate.' };
    }
}

    

    

    


