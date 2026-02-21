import bcrypt from "bcrypt";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import type { SessionRecord, SessionState } from "./sessionService";
import { sessionService } from "./sessionService";
import { deepseekService } from "./deepseekService";

function isAdminPhone(phoneNumber: string) {
  return phoneNumber === env.ADMIN_PHONE.replace(/\D/g, "");
}

function menuText(isAdmin: boolean) {
  if (isAdmin) {
    return [
      "1️⃣ Total Users",
      "2️⃣ Total Transactions",
      "3️⃣ Total Revenue",
      "4️⃣ Broadcast Message",
      "5️⃣ Credit User Wallet",
    ].join("\n");
  }

  return [
    "1️⃣ Check Balance",
    "2️⃣ Buy Airtime",
    "3️⃣ Buy Data",
    "4️⃣ AI Chat",
    "5️⃣ Help",
  ].join("\n");
}

function helpText() {
  return [
    "Send one of:",
    "- register",
    "- login",
    "- menu",
    "- logout",
  ].join("\n");
}

function normalizeInput(s: string) {
  return s.trim();
}

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

function normalizePhone(s: string) {
  return s.replace(/\D/g, "");
}

function isPositiveNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

const dataPlans: Record<string, { code: string; label: string; amount: number }[]> = {
  MTN: [
    { code: "1", label: "500MB - ₦150", amount: 150 },
    { code: "2", label: "1GB - ₦300", amount: 300 },
    { code: "3", label: "2GB - ₦600", amount: 600 },
  ],
  GLO: [
    { code: "1", label: "1GB - ₦250", amount: 250 },
    { code: "2", label: "2GB - ₦500", amount: 500 },
  ],
  AIRTEL: [
    { code: "1", label: "1GB - ₦300", amount: 300 },
    { code: "2", label: "2GB - ₦600", amount: 600 },
  ],
  _9MOBILE: [
    { code: "1", label: "1GB - ₦350", amount: 350 },
  ],
};

function networkMenu() {
  return ["Choose network:", "1) MTN", "2) GLO", "3) AIRTEL", "4) 9MOBILE"].join("\n");
}

function pickNetwork(code: string): keyof typeof dataPlans | null {
  const c = code.trim();
  if (c === "1") return "MTN";
  if (c === "2") return "GLO";
  if (c === "3") return "AIRTEL";
  if (c === "4") return "_9MOBILE";
  return null;
}

function showPlans(network: keyof typeof dataPlans) {
  const plans = dataPlans[network];
  const title = network === "_9MOBILE" ? "9MOBILE" : network;
  return [
    `Data plans for ${title}:`,
    ...plans.map((p) => `${p.code}) ${p.label}`),
    "Reply with plan number",
  ].join("\n");
}

async function requireUser(session: SessionRecord) {
  if (!session.userId) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

async function ensureAdminUser(phoneNumber: string) {
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      fullName: "Admin",
      email: `admin_${phoneNumber}@local`,
      password: await bcrypt.hash("admin", 10),
      phoneNumber,
      walletBalance: 0,
      role: "ADMIN",
    },
  });
}

export const flowRouterService = {
  handleUserMessage: async ({
    phoneNumber,
    text,
    session,
  }: {
    phoneNumber: string;
    text: string;
    session: SessionRecord;
  }): Promise<string | null> => {
    const msg = normalizeInput(text);
    const lower = msg.toLowerCase();

    const isAdmin = isAdminPhone(phoneNumber);

    if (isAdmin && (!session.userId || !session.isLoggedIn)) {
      const adminUser = await ensureAdminUser(phoneNumber);
      await sessionService.setLoggedIn(phoneNumber, adminUser.id);
      session = await prisma.session.findUniqueOrThrow({ where: { phoneNumber } }) as any;
    }

    if (lower === "menu") {
      await sessionService.setState(phoneNumber, isAdmin ? "ADMIN_MENU" : "MENU", {});
      return menuText(isAdmin);
    }

    if (lower === "logout") {
      await sessionService.logout(phoneNumber);
      return "Logged out.";
    }

    if (!session.isLoggedIn) {
      if (lower === "register") {
        await sessionService.setState(phoneNumber, "REGISTER_FULLNAME", {});
        return "Enter Full Name:";
      }

      if (lower === "login") {
        await sessionService.setState(phoneNumber, "LOGIN_EMAIL", {});
        return "Enter Email:";
      }

      const state = session.state as SessionState;

      if (state === "REGISTER_FULLNAME") {
        const fullName = msg;
        if (fullName.length < 2) return "Full Name too short. Enter Full Name:";
        await sessionService.setState(phoneNumber, "REGISTER_EMAIL", { fullName });
        return "Enter Email:";
      }

      if (state === "REGISTER_EMAIL") {
        const email = normalizeEmail(msg);
        if (!email.includes("@")) return "Invalid email. Enter Email:";

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          await sessionService.setState(phoneNumber, "IDLE", {});
          return "Email already exists. Send 'login' to continue.";
        }

        const temp = session.tempData ?? {};
        await sessionService.setState(phoneNumber, "REGISTER_PASSWORD", { ...temp, email });
        return "Enter Password:";
      }

      if (state === "REGISTER_PASSWORD") {
        const password = msg;
        if (password.length < 6) return "Password too short (min 6). Enter Password:";

        const temp = session.tempData ?? {};
        const fullName = String(temp.fullName ?? "");
        const email = String(temp.email ?? "");

        const passwordHash = await bcrypt.hash(password, 10);

        const existingPhone = await prisma.user.findUnique({ where: { phoneNumber } });
        if (existingPhone) {
          await sessionService.setState(phoneNumber, "IDLE", {});
          return "Phone number already registered. Send 'login'.";
        }

        const user = await prisma.user.create({
          data: {
            fullName,
            email,
            password: passwordHash,
            phoneNumber,
            walletBalance: 0,
            role: "USER",
          },
        });

        await sessionService.setLoggedIn(phoneNumber, user.id);
        return menuText(false);
      }

      if (state === "LOGIN_EMAIL") {
        const email = normalizeEmail(msg);
        if (!email.includes("@")) return "Invalid email. Enter Email:";
        await sessionService.setState(phoneNumber, "LOGIN_PASSWORD", { email });
        return "Enter Password:";
      }

      if (state === "LOGIN_PASSWORD") {
        const password = msg;
        const email = String(session.tempData?.email ?? "");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await sessionService.setState(phoneNumber, "IDLE", {});
          return "Invalid credentials. Send 'login' to try again.";
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          await sessionService.setState(phoneNumber, "IDLE", {});
          return "Invalid credentials. Send 'login' to try again.";
        }

        await sessionService.setLoggedIn(phoneNumber, user.id);
        return menuText(user.role === "ADMIN");
      }

      return "Send 'register' or 'login'.";
    }

    if (isAdmin) {
      return flowRouterService.handleAdmin({ phoneNumber, msg, session });
    }

    return flowRouterService.handleUser({ phoneNumber, msg, session });
  },

  handleUser: async ({ phoneNumber, msg, session }: { phoneNumber: string; msg: string; session: SessionRecord }) => {
    const state = session.state as SessionState;

    if (state === "MENU") {
      if (msg === "1") {
        const user = await requireUser(session);
        if (!user) return "Session error. Send 'login'.";
        return `Wallet Balance: ₦${user.walletBalance}`;
      }
      if (msg === "2") {
        await sessionService.setState(phoneNumber, "BUY_AIRTIME_NETWORK", {});
        return networkMenu();
      }
      if (msg === "3") {
        await sessionService.setState(phoneNumber, "BUY_DATA_NETWORK", {});
        return networkMenu();
      }
      if (msg === "4") {
        await sessionService.setState(phoneNumber, "AI_CHAT", {});
        return "Send your message for AI:";
      }
      if (msg === "5") {
        return helpText();
      }
      return menuText(false);
    }

    if (state === "BUY_AIRTIME_NETWORK") {
      const network = pickNetwork(msg);
      if (!network) return networkMenu();
      await sessionService.setState(phoneNumber, "BUY_AIRTIME_PHONE", { network });
      return "Enter phone number to recharge:";
    }

    if (state === "BUY_AIRTIME_PHONE") {
      const toPhone = normalizePhone(msg);
      if (toPhone.length < 10) return "Invalid phone number. Enter phone number to recharge:";
      await sessionService.setState(phoneNumber, "BUY_AIRTIME_AMOUNT", { ...(session.tempData ?? {}), toPhone });
      return "Enter amount:";
    }

    if (state === "BUY_AIRTIME_AMOUNT") {
      if (!isPositiveNumber(msg)) return "Invalid amount. Enter amount:";
      const amount = Number(msg);
      const user = await requireUser(session);
      if (!user) return "Session error. Send 'login'.";

      if (user.walletBalance < amount) {
        await sessionService.setState(phoneNumber, "MENU", {});
        return "Insufficient balance.\n" + menuText(false);
      }

      const networkKey = String(session.tempData?.network ?? "");
      const toPhone = String(session.tempData?.toPhone ?? "");
      const network = networkKey === "_9MOBILE" ? "9MOBILE" : networkKey;

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { walletBalance: { decrement: amount } },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "AIRTIME",
            network,
            phoneNumber: toPhone,
            amount,
            status: "SUCCESS",
          },
        });
      });

      await sessionService.setState(phoneNumber, "MENU", {});
      return `Airtime purchase successful.\nNetwork: ${network}\nPhone: ${toPhone}\nAmount: ₦${amount}\n\n${menuText(false)}`;
    }

    if (state === "BUY_DATA_NETWORK") {
      const network = pickNetwork(msg);
      if (!network) return networkMenu();
      await sessionService.setState(phoneNumber, "BUY_DATA_PLAN", { network });
      return showPlans(network);
    }

    if (state === "BUY_DATA_PLAN") {
      const network = session.tempData?.network as keyof typeof dataPlans;
      const plans = dataPlans[network];
      const plan = plans?.find((p) => p.code === msg.trim());
      if (!plan) return showPlans(network);

      await sessionService.setState(phoneNumber, "BUY_DATA_PHONE", {
        ...(session.tempData ?? {}),
        planCode: plan.code,
        planAmount: plan.amount,
        planLabel: plan.label,
      });

      return "Enter phone number for data:";
    }

    if (state === "BUY_DATA_PHONE") {
      const toPhone = normalizePhone(msg);
      if (toPhone.length < 10) return "Invalid phone number. Enter phone number for data:";

      const user = await requireUser(session);
      if (!user) return "Session error. Send 'login'.";

      const amount = Number(session.tempData?.planAmount ?? 0);
      const planLabel = String(session.tempData?.planLabel ?? "");

      if (user.walletBalance < amount) {
        await sessionService.setState(phoneNumber, "MENU", {});
        return "Insufficient balance.\n" + menuText(false);
      }

      const networkKey = String(session.tempData?.network ?? "");
      const network = networkKey === "_9MOBILE" ? "9MOBILE" : networkKey;

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { walletBalance: { decrement: amount } },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "DATA",
            network,
            phoneNumber: toPhone,
            amount,
            status: "SUCCESS",
          },
        });
      });

      await sessionService.setState(phoneNumber, "MENU", {});
      return `Data purchase successful.\nNetwork: ${network}\nPhone: ${toPhone}\nPlan: ${planLabel}\nAmount: ₦${amount}\n\n${menuText(false)}`;
    }

    if (state === "AI_CHAT") {
      if (msg.length === 0) return "Send your message for AI:";
      const ai = await deepseekService.chat(msg);
      await sessionService.setState(phoneNumber, "MENU", {});
      return `${ai}\n\n${menuText(false)}`;
    }

    await sessionService.setState(phoneNumber, "MENU", {});
    return menuText(false);
  },

  handleAdmin: async ({ phoneNumber, msg, session }: { phoneNumber: string; msg: string; session: SessionRecord }) => {
    const state = session.state as SessionState;

    if (state !== "ADMIN_MENU" && state !== "ADMIN_BROADCAST" && state !== "ADMIN_CREDIT_PHONE" && state !== "ADMIN_CREDIT_AMOUNT") {
      await sessionService.setState(phoneNumber, "ADMIN_MENU", {});
      return menuText(true);
    }

    if (state === "ADMIN_MENU") {
      if (msg === "1") {
        const count = await prisma.user.count();
        return `Total Users: ${count}`;
      }
      if (msg === "2") {
        const count = await prisma.transaction.count();
        return `Total Transactions: ${count}`;
      }
      if (msg === "3") {
        const agg = await prisma.transaction.aggregate({
          where: { status: "SUCCESS" },
          _sum: { amount: true },
        });
        return `Total Revenue: ₦${agg._sum.amount ?? 0}`;
      }
      if (msg === "4") {
        await sessionService.setState(phoneNumber, "ADMIN_BROADCAST", {});
        return "Enter broadcast message:";
      }
      if (msg === "5") {
        await sessionService.setState(phoneNumber, "ADMIN_CREDIT_PHONE", {});
        return "Enter user phone number to credit:";
      }

      return menuText(true);
    }

    if (state === "ADMIN_BROADCAST") {
      const message = msg;
      if (message.length < 1) return "Enter broadcast message:";

      const users = await prisma.user.findMany({ select: { phoneNumber: true } });
      const recipients = users.map((u) => u.phoneNumber).filter(Boolean);

      // Broadcast sending is handled by webhook service via WhatsApp API.
      // For safety, we store broadcast request in tempData and let subsequent calls execute.
      // Here we send sequentially to avoid rate limits.
      const { whatsappMessageService } = await import("./whatsappMessageService");

      for (const to of recipients) {
        if (!to) continue;
        await whatsappMessageService.sendText(to, message);
      }

      await sessionService.setState(phoneNumber, "ADMIN_MENU", {});
      return "Broadcast sent.\n\n" + menuText(true);
    }

    if (state === "ADMIN_CREDIT_PHONE") {
      const userPhone = normalizePhone(msg);
      if (userPhone.length < 10) return "Invalid phone. Enter user phone number to credit:";
      await sessionService.setState(phoneNumber, "ADMIN_CREDIT_AMOUNT", { userPhone });
      return "Enter amount:";
    }

    if (state === "ADMIN_CREDIT_AMOUNT") {
      if (!isPositiveNumber(msg)) return "Invalid amount. Enter amount:";
      const amount = Number(msg);
      const userPhone = String(session.tempData?.userPhone ?? "");

      const user = await prisma.user.findUnique({ where: { phoneNumber: userPhone } });
      if (!user) {
        await sessionService.setState(phoneNumber, "ADMIN_MENU", {});
        return "User not found.\n\n" + menuText(true);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { walletBalance: { increment: amount } },
      });

      await sessionService.setState(phoneNumber, "ADMIN_MENU", {});
      return `Wallet credited.\nUser: ${userPhone}\nAmount: ₦${amount}\n\n${menuText(true)}`;
    }

    await sessionService.setState(phoneNumber, "ADMIN_MENU", {});
    return menuText(true);
  },
};
