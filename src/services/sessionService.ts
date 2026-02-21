import { prisma } from "../prisma/client";

export type SessionState =
  | "IDLE"
  | "REGISTER_FULLNAME"
  | "REGISTER_EMAIL"
  | "REGISTER_PASSWORD"
  | "LOGIN_EMAIL"
  | "LOGIN_PASSWORD"
  | "MENU"
  | "BALANCE"
  | "BUY_AIRTIME_NETWORK"
  | "BUY_AIRTIME_PHONE"
  | "BUY_AIRTIME_AMOUNT"
  | "BUY_DATA_NETWORK"
  | "BUY_DATA_PLAN"
  | "BUY_DATA_PHONE"
  | "AI_CHAT"
  | "ADMIN_MENU"
  | "ADMIN_BROADCAST"
  | "ADMIN_CREDIT_PHONE"
  | "ADMIN_CREDIT_AMOUNT";

export type SessionRecord = {
  id: string;
  phoneNumber: string;
  state: SessionState;
  tempData: any;
  isLoggedIn: boolean;
  userId: string | null;
};

export const sessionService = {
  getOrCreate: async (phoneNumber: string): Promise<SessionRecord> => {
    const session = await prisma.session.upsert({
      where: { phoneNumber },
      update: {},
      create: {
        phoneNumber,
        state: "IDLE",
        tempData: {},
        isLoggedIn: false,
        userId: null,
      },
    });

    return session as any;
  },

  setState: async (phoneNumber: string, state: SessionState, tempData?: any) => {
    await prisma.session.update({
      where: { phoneNumber },
      data: {
        state,
        ...(tempData !== undefined ? { tempData } : {}),
      },
    });
  },

  setLoggedIn: async (phoneNumber: string, userId: string) => {
    await prisma.session.update({
      where: { phoneNumber },
      data: {
        isLoggedIn: true,
        userId,
        state: "MENU",
        tempData: {},
      },
    });
  },

  logout: async (phoneNumber: string) => {
    await prisma.session.update({
      where: { phoneNumber },
      data: {
        isLoggedIn: false,
        userId: null,
        state: "IDLE",
        tempData: {},
      },
    });
  },
};
