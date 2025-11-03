
export type UserRole = 'user' | 'agent' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  customId: string; // 6-digit unique ID for users/agents
  createdAt: string;
  disabled: boolean;
  agentId?: string; // UID of the agent
  agentCustomId?: string; // 6-digit ID of the agent
  walletBalance: number;
  cashBalance: number;
  creditBalance: number;
  mobile?: string;
  upiId?: string; // For withdrawals
  walletLimit?: number | null;
  fcmToken?: string; // For push notifications
  commissionRate?: number; // Agent-specific commission rate (as a decimal, e.g., 0.05 for 5%)
}

export type Lottery = {
  id?: string;
  name: string;
  jackpot?: number;
  drawDate?: Date;
  logo?: string;
  openTime?: string | null;
  closeTime?: string | null;
};

export type LotteryResult = {
  lotteryName: string;
  drawDate: string;
  openPanna?: string;
  openAnk?: string;
  closePanna?: string;
  closeAnk?: string;
  jodi?: string;
  fullResult?: string;
  status: 'open' | 'closed' | 'pending';
  source?: 'manual' | 'automatic';
};

export type BetTime = 'open' | 'close';
export type BetType = 
  | 'single_ank' 
  | 'jodi' 
  | 'single_panna' 
  | 'double_panna' 
  | 'triple_panna' 
  | 'starline'
  | 'half_sangam'
  | 'full_sangam';

export interface Bet {
  id: string;
  userId: string;
  userEmail: string;
  agentId?: string;
  lotteryName: string;
  betType: BetType;
  betTime?: BetTime;
  numbers: string;
  amount: number;
  createdAt: string; // ISO string
  status: 'placed' | 'won' | 'lost';
  payout?: number;
  commissionProcessed?: boolean;
}

export interface Transaction {
  id: string;
  fromId: string;
  fromEmail?: string;
  toId: string;
  toEmail?: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'commission' | 'transfer';
  paymentType: 'cash' | 'credit';
  timestamp: string; // ISO string
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userUpiId?: string; // User's UPI ID at the time of request
  agentId?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string; // ISO string
  processedAt?: string; // ISO string
  processedBy?: string; // UID of admin/agent
}

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  agentId?: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string; // ISO string
  processedAt?: string; // ISO string
  processedBy?: string; // UID of admin/agent
}


export interface GameSettings {
  rates: Record<BetType, number>;
  commission: number;
  upiId?: string;
  qrCodeUrl?: string;
}
