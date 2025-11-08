

'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
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
  const userUpdates: { [userId: string]: { wallet: number, cash: number } } = {};

  const processBet = (bet: Bet) => {
    const payout = bet.amount * (rates[bet.betType] || 0);
    transaction.update(adminDb.collection('bets').doc(bet.id), { status: 'won', payout });

    if (!userUpdates[bet.userId]) {
      userUpdates[bet.userId] = { wallet: 0, cash: 0 };
    }
    userUpdates[bet.userId].wallet += payout;

    const txRef = adminDb.collection('transactions').doc();
    transaction.set(txRef, {
      fromId: 'game-pot', toId: bet.userId, toEmail: bet.userEmail,
      amount: payout, type: 'win', paymentType: 'cash',
      timestamp: new Date().toISOString(),
    } as Omit<Transaction, 'id'>);
  };
  
  const loseBet = (bet: Bet) => {
      transaction.update(adminDb.collection('bets').doc(bet.id), { status: 'lost' });
  };

  // --- Handle Starline Separately ---
  if (lotteryName.toLowerCase().includes('starline')) {
    const starlineBetsQuery = adminDb.collection('bets').where('lotteryName', '==', lotteryName).where('status', '==', 'placed');
    const snap = await transaction.get(starlineBetsQuery);
    for (const betDoc of snap.docs) {
      const bet = { id: betDoc.id, ...betDoc.data() } as Bet;
      if (bet.betType === 'starline' && bet.numbers === winningAnk) {
        processBet(bet);
      } else {
        loseBet(bet);
      }
    }
  } else {
    // --- Regular Open/Close Games ---
    const allBetsQuery = adminDb.collection('bets').where('lotteryName', '==', lotteryName).where('status', '==', 'placed');
    const snap = await transaction.get(allBetsQuery);

    for (const betDoc of snap.docs) {
        const bet = { id: betDoc.id, ...betDoc.data() } as Bet;
        
        switch (bet.betType) {
            // Settled on Open OR Close result
            case 'single_ank':
            case 'single_panna':
            case 'double_panna':
            case 'triple_panna':
                if (bet.betTime === resultType) {
                    const isWinner = (bet.betType === 'single_ank' && bet.numbers === winningAnk) || (bet.betType.includes('panna') && bet.numbers === winningPanna);
                    if (isWinner) processBet(bet);
                    else loseBet(bet);
                }
                break;
            
            // Settled only on Close result
            case 'jodi':
                if (resultType === 'close') {
                    const { openAnk, closeAnk } = openClosePair || {};
                    if (openAnk && closeAnk && bet.numbers === `${openAnk}${closeAnk}`) {
                        processBet(bet);
                    } else {
                        loseBet(bet);
                    }
                }
                break;
            case 'half_sangam':
                 if (resultType === 'close') {
                    const { openAnk, closeAnk, openPanna, closePanna } = openClosePair || {};
                    if (openAnk && closeAnk && openPanna && closePanna) {
                        if (bet.numbers === `${openPanna}${closeAnk}` || bet.numbers === `${openAnk}${closePanna}`) {
                            processBet(bet);
                        } else {
                            loseBet(bet);
                        }
                    } else {
                       loseBet(bet);
                    }
                }
                break;
            case 'full_sangam':
                if (resultType === 'close') {
                    const { openPanna, closePanna } = openClosePair || {};
                    if (openPanna && closePanna && bet.numbers === `${openPanna}${closePanna}`) {
                        processBet(bet);
                    } else {
                        loseBet(bet);
                    }
                }
                break;
        }
    }
  }
  
  // Batch update user wallets
  for (const userId in userUpdates) {
    const userRef = adminDb.collection('users').doc(userId);
    transaction.update(userRef, {
      walletBalance: FieldValue.increment(userUpdates[userId].wallet),
    });
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
): Promise<{ success: boolean; isNewUser: boolean; role: UserRole }> {
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    if (doc.exists) {
      return { success: true, isNewUser: false, role: (doc.data() as UserProfile).role };
    }

    // If user is authenticated but has no profile, create one.
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

    return { success: true, isNewUser: true, role: 'user' };
  } catch (err) {
    console.error('handleSignIn error:', err);
    return { success: false, isNewUser: false, role: 'user' };
  }
}

/** Place a bet */
export async function placeBet(betDetails: {
  authToken: string;
  userId?: string; // Optional: For admin/agent to specify user
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

  const requestingUser = await getAuthorizedUser(authToken);
  if (!requestingUser) return { success: false, message: 'Unauthorized.' };
  
  let targetUserId = requestingUser.uid;
  let placingForOther = false;

  // If a specific user ID is provided, it means an admin or agent is placing for someone else.
  if (userId && userId !== requestingUser.uid) {
      targetUserId = userId;
      placingForOther = true;
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
      const lottery = (await listLotteryGames()).find(l => l.name === lotteryName);
      if (!lottery) return { success: false, message: 'Game not found.' };

      const profile = userDoc.data() as UserProfile;

      // Permission Check: If placing for another user, verify permissions
      if (placingForOther) {
          if (requestingUser.role === 'user') {
              return { success: false, message: 'You cannot place bets for other users.' };
          }
          if (requestingUser.role === 'agent' && profile.agentId !== requestingUser.uid) {
              return { success: false, message: 'You can only place bets for users assigned to you.' };
          }
          // Admin has all permissions, no extra check needed.
      }


      // account checks
      if (profile.disabled) return { success: false, message: 'User account is disabled.' };
      if (profile.walletLimit != null && (profile.walletBalance) > profile.walletLimit)
        return { success: false, message: `Wallet limit ${profile.walletLimit} reached.` };

      // market checks (skip for Starline)
      if (!lottery.name.toLowerCase().includes('starline') && lottery.openTime && lottery.closeTime) {
        const now = nowIST();
        const hhmm = timeHHMM(now);
        
        const isBeforeOpen = hhmm < lottery.openTime;
        const isBeforeClose = hhmm < lottery.closeTime;

        if (['jodi', 'half_sangam', 'full_sangam'].includes(betType)) {
          if (!isBeforeOpen)
            return { success: false, message: 'Betting closed for this market. Jodi/Sangam can only be placed before Open time.' };
        } else if (betTime === 'open') {
          if (!isBeforeOpen) return { success: false, message: 'Open market is closed.' };
        } else if (betTime === 'close') {
          if (!isBeforeClose) return { success: false, message: 'Close market is closed.' };
        }
      }

      // balance check
      if (profile.cashBalance < amount)
        return { success: false, message: 'Insufficient cash balance.' };

      // deduct
      tx.update(userRef, { 
          walletBalance: FieldValue.increment(-amount),
          cashBalance: FieldValue.increment(-amount),
      });

      // write bet
      const betRef = adminDb.collection('bets').doc();
      const betData: Omit<Bet, 'id'> = {
        userId: targetUserId,
        userEmail: profile.email,
        agentId: profile.agentId,
        lotteryName,
        betType,
        numbers,
        amount,
        createdAt: new Date().toISOString(),
        status: 'placed',
        commissionProcessed: false,
      };
      if (betTime) {
        betData.betTime = betTime;
      }

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
  if (!lotteryName) return { success: false, message: 'Select a lottery.' };
  if (!/^\d{3}$/.test(panna)) return { success: false, message: 'Panna must be 3 digits.' };

  const ank = sumDigitsMod10(panna);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const resultRef = adminDb.collection('results').doc(lotteryName);
      const resultDoc = await transaction.get(resultRef);
      const existingData = (resultDoc.exists ? resultDoc.data() : {}) as Partial<LotteryResult>;

      let openPanna: string | undefined,
          openAnk: string | undefined,
          closePanna: string | undefined,
          closeAnk: string | undefined;

      if (resultType === 'open') {
        openPanna = panna;
        openAnk = ank;
      } else { // 'close'
        if (!resultDoc.exists || !existingData.openPanna || !existingData.openAnk) {
          throw new Error('Cannot declare close result before open result is declared.');
        }
        openPanna = existingData.openPanna;
        openAnk = existingData.openAnk;
        closePanna = panna;
        closeAnk = ank;
      }

      const status: LotteryResult['status'] = resultType === 'open' ? 'open' : 'closed';
      const jodi = openAnk && closeAnk ? `${openAnk}${closeAnk}` : undefined;
      
      let fullResult: string | undefined = undefined;
      if (openPanna && openAnk && closePanna && closeAnk && jodi) {
        fullResult = `${openPanna}-${jodi}-${closePanna}`;
      } else if (openPanna && openAnk) {
        fullResult = `${openPanna}-${openAnk}`;
      }

      const resultData: Partial<LotteryResult> = {
        lotteryName,
        drawDate: new Date().toISOString(),
        openPanna: openPanna,
        openAnk: openAnk,
        closePanna: closePanna,
        closeAnk: closeAnk,
        jodi: jodi,
        fullResult: fullResult,
        status,
        source: 'manual',
      };
      
      transaction.set(resultRef, resultData, { merge: true });

      // Only write to historical results on 'close'
      if (resultType === 'close' && fullResult) {
          const historicalResultRef = adminDb.collection('historical_results').doc();
          transaction.set(historicalResultRef, { ...resultData, drawDate: new Date().toISOString() });
      }

      await processWinners(transaction, lotteryName, resultType, ank, panna, {
        openAnk,
        closeAnk,
        openPanna,
        closePanna,
      });

      if (resultType === 'close') {
        await processCommissions(transaction, lotteryName);
      }
    });

    revalidatePath('/admin/results');
    return { success: true, message: `Result declared for ${lotteryName}.` };

  } catch (err: any) {
    console.error('declareResultManually error:', err);
    return { success: false, message: err.message || 'Failed to declare result.' };
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
            const usersData = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

            let totalBetAmount = 0;
            let totalBetsCount = 0;
            let totalCommission = 0;
            const userBetStats: Record<string, { email: string, name: string, count: number, amount: number }> = {};
            
            usersData.forEach(user => {
                userBetStats[user.uid] = {
                    email: user.email,
                    name: user.name,
                    count: 0,
                    amount: 0,
                };
            });

            if (userIds.length > 0) {
                // Firestore 'in' queries are limited to 30 elements. If an agent has more users, this needs chunking.
                // For now, assuming agent has < 30 users for simplicity.
                const betsSnap = await adminDb.collection('bets').where('userId', 'in', userIds).get();
                betsSnap.forEach(doc => {
                    const bet = doc.data() as Bet;
                    totalBetAmount += safeNumber(bet.amount);
                    totalBetsCount++;

                    if (userBetStats[bet.userId]) {
                        userBetStats[bet.userId].count++;
                        userBetStats[bet.userId].amount += bet.amount;
                    }
                });
            }

            const commSnap = await adminDb.collection('transactions').where('toId', '==', targetAgentId).where('type', '==', 'commission').get();
            commSnap.forEach(doc => {
                totalCommission += safeNumber(doc.data().amount);
            });
            
            const activeUsersList = Object.values(userBetStats)
                .filter(u => u.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // If an agent is calling for themselves, return a simplified view
            if (currentUser.role === 'agent') {
                return {
                    success: true,
                    stats: {
                        totalUsers: usersSnap.size,
                        totalBets: totalBetsCount,
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
            
            agentsSnap.docs.forEach(doc => {
              agentCommissions[doc.id] = 0;
            });
            
            commSnap.forEach(doc => {
                const tx = doc.data() as Transaction;
                if(agentCommissions.hasOwnProperty(tx.toId)) {
                   agentCommissions[tx.toId] += tx.amount;
                }
            });
            
            const sortedAgents = Object.entries(agentCommissions).sort((a, b) => b[1] - a[1]);
            let topAgentInfo = { name: 'N/A', commission: 0 };

            if (sortedAgents.length > 0 && sortedAgents[0][1] > 0) {
                const [topAgentId, topCommission] = sortedAgents[0];
                 const agentDoc = await adminDb.collection('users').doc(topAgentId).get();
                if(agentDoc.exists) {
                    topAgentInfo = { name: (agentDoc.data() as UserProfile).customId, commission: topCommission };
                }
            } else if (agentsSnap.size > 0) {
                // If no commissions earned yet, but agents exist, show the first agent.
                const firstAgentDoc = agentsSnap.docs[0];
                topAgentInfo = { name: (firstAgentDoc.data() as UserProfile).customId, commission: 0};
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
                    mostPlayedGame: Object.keys(gameCounts).length > 0 ? Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0][0] : 'N/A',
                    highestRevenueGame: Object.keys(gameRevenue).length > 0 ? Object.entries(gameRevenue).sort((a, b) => b[1] - a[1])[0][0] : 'N/A',
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
    if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
        return { success: false, message: 'Unauthorized.' };
    }

    try {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return { success: false, message: 'User not found.' };
        }
        const user = userDoc.data() as UserProfile;

        // If deleting an agent, un-assign their users
        if (user.role === 'agent') {
            const usersSnap = await adminDb.collection('users').where('agentId', '==', uid).get();
            const batch = adminDb.batch();
            usersSnap.forEach(doc => {
                const userRef = adminDb.collection('users').doc(doc.id);
                batch.update(userRef, {
                    agentId: FieldValue.delete(),
                    agentCustomId: FieldValue.delete()
                });
            });
            await batch.commit();
        }

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
  agentUid?: string
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
    let finalAgentUid: string | undefined;
    
    // If an agent is creating a user, force their own agent ID
    if (currentUser.role === 'agent') {
        finalAgentUid = currentUser.uid;
    } else {
        // If an admin is creating, use the selected ID from the form
        finalAgentUid = agentUid;
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
  
  return { success: true, message: 'Withdrawal request submitted! It will be processed shortly.' };
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
  const currentUser = await getAuthorizedUser();
  if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
    return { success: false, message: 'Unauthorized.' };
  }

  const reqRef = adminDb.collection('withdrawals').doc(requestId);

  try {
    return await adminDb.runTransaction(async (tx) => {
      const reqDoc = await tx.get(reqRef);
      if (!reqDoc.exists) throw new Error('Request not found.');

      const req = reqDoc.data() as WithdrawalRequest;
      if (req.status !== 'pending') throw new Error(`Request is already ${req.status}.`);
      
      const userRef = adminDb.collection('users').doc(req.userId);
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) throw new Error('User account not found.');

      if (action === 'approve') {
        const userProfile = userDoc.data() as UserProfile;
        if (req.amount > userProfile.cashBalance) {
          throw new Error('User has insufficient cash balance for this withdrawal.');
        }

        // 1. Deduct from wallet
        tx.update(userRef, {
          walletBalance: FieldValue.increment(-req.amount),
          cashBalance: FieldValue.increment(-req.amount),
        });

        // 2. Mark request as approved
        tx.update(reqRef, {
          status: 'approved',
          processedAt: new Date().toISOString(),
          processedBy: currentUser.uid,
        });

        // 3. Create transaction record
        const newTxRef = adminDb.collection('transactions').doc();
        tx.set(newTxRef, {
            fromId: req.userId,
            fromEmail: req.userEmail,
            toId: 'bank',
            toEmail: 'Bank Transfer',
            amount: req.amount,
            type: 'withdrawal',
            paymentType: 'cash',
            timestamp: new Date().toISOString(),
        } as Omit<Transaction, 'id'>);

        return { success: true, message: 'Withdrawal approved. Funds have been deducted from user wallet.' };
      } else { // 'reject'
        tx.update(reqRef, {
          status: 'rejected',
          processedAt: new Date().toISOString(),
          processedBy: currentUser.uid,
        });
        return { success: true, message: 'Withdrawal request has been rejected.' };
      }
    });
  } catch (err: any) {
    console.error('processWithdrawalRequest error:', err);
    return { success: false, message: err.message || 'Server error while processing request.' };
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
            
            if (type === 'credit') {
                updates.creditBalance = FieldValue.increment(amount);
            } else { // 'cash'
                 updates.cashBalance = FieldValue.increment(amount);
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
            commissionRate: 0.05, // Default commission
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

    // Allow admin to view all transactions regardless of userId/role passed
    if(currentUser.role === 'admin') {
        const snap = await adminDb.collection('transactions').orderBy('timestamp', 'desc').limit(200).get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    }
    
    // For users and agents, only allow them to view their own transactions
    if (currentUser.uid !== userId) return [];

    if (role === 'user' || role === 'agent') {
        const sentQ = adminDb.collection('transactions').where('fromId', '==', userId);
        const receivedQ = adminDb.collection('transactions').where('toId', '==', userId);
        
        const [sentSnap, receivedSnap] = await Promise.all([sentQ.get(), receivedQ.get()]);
        
        const txMap = new Map<string, Transaction>();
        sentSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data()} as Transaction));
        receivedSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data()} as Transaction));

        return Array.from(txMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
    
    let approvedCount = 0;
    let failedCount = 0;
    let notFoundCount = 0;

    const results = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
    });

    // Assuming column names are 'Transaction ID' and 'Amount'
    // This can be made more robust
    const requiredHeaders = ['Transaction ID', 'Amount'];
    if (!results.meta.fields || !requiredHeaders.every(h => results.meta.fields?.includes(h))) {
        return { success: false, message: `CSV must contain the following headers: ${requiredHeaders.join(', ')}` };
    }

    for (const row of results.data as any[]) {
        const txnId = row['Transaction ID'];
        const amountStr = row['Amount'];
        
        if (!txnId || !amountStr) {
            failedCount++;
            continue;
        }

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
                notFoundCount++;
            }
        } catch(e) {
            console.error(`Error processing row: ${JSON.stringify(row)}`, e);
            failedCount++;
        }
    }

    return { success: true, message: `Processing complete. Approved: ${approvedCount}. Not Found: ${notFoundCount}. Failed: ${failedCount}.` };
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
