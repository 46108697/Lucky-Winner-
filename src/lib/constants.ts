
import type { Lottery, LotteryResult } from './types';

// Adding resultTime for the cron job to trigger result declaration
export const LOTTERIES: Lottery[] = [
  {
    name: 'Kalyan',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '16:10',
    closeTime: '18:10',
  },
  {
    name: 'Kalyan Night',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '21:10',
    closeTime: '23:10',
  },
  {
    name: 'Milan Day',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '15:00',
    closeTime: '17:00',
  },
  {
    name: 'Milan Night',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '20:45',
    closeTime: '22:45',
  },
  {
    name: 'Rajdhani Day',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '17:00',
    closeTime: '19:00',
  },
  {
    name: 'Rajdhani Night',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '21:25',
    closeTime: '23:35',
  },
  {
    name: 'Time Bazar',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '13:00',
    closeTime: '14:00',
  },
  {
    name: 'Main Bazar',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '21:30',
    closeTime: '23:50',
  },
  {
    name: 'Sridevi',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '11:35',
    closeTime: '12:35',
  },
  {
    name: 'Sridevi Night',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '19:00',
    closeTime: '20:00',
  },
  {
    name: 'Madhur Day',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '13:30',
    closeTime: '14:30',
  },
  {
    name: 'Madhur Night',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '20:30',
    closeTime: '22:30',
  },
  {
    name: 'Supreme Day',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '15:35',
    closeTime: '17:35',
  },
  {
    name: 'Supreme Night',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    openTime: '20:45',
    closeTime: '22:45',
  },
  {
    name: 'Starline',
    jackpot: 0,
    drawDate: new Date(),
    logo: 'https://placehold.co/48x48.png',
    // No open/close time means it's available 24/7
  },
];

// This is now just for reference, results will be fetched from the database.
export const RESULTS: LotteryResult[] = [
    {
        lotteryName: 'Kalyan',
        drawDate: new Date().toISOString(),
        fullResult: "140-5_58-345-2",
        status: 'closed'
    },
];
