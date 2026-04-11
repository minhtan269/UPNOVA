import "use server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserChatSessions() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return null;
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return sessions;
  } catch (error) {
    console.error("[Server] Error fetching user chat sessions:", error);
    return null;
  }
}

export async function getMostRecentChatSession() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return null;
    }

    const mostRecent = await prisma.chatSession.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return mostRecent;
  } catch (error) {
    console.error("[Server] Error fetching most recent chat session:", error);
    return null;
  }
}
