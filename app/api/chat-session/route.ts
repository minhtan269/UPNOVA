import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all saved sessions for current user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("[API] Error fetching chat sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST save/create a chat session
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      id,
      label,
      messages,
      sessionStats,
      selectedModelId,
      selectedRegion,
      carbonBudget,
      resilienceHistory,
      ciSource,
      ciFactorType,
      ciZoneLabel,
      ciIsRepresentativeZone,
      greenHours,
      advisorSupplementalInput,
      advisorDraft,
      advisorQAHistory,
      sessionStartTime,
    } = body;

    let chatSession;

    if (id) {
      // Update existing session - MUST verify ownership
      const existingSession = await prisma.chatSession.findUnique({
        where: { id },
        select: { userId: true, id: true },
      });

      if (!existingSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // Security check: only user who owns the session can update it
      if (existingSession.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden: Cannot update other user's session" }, { status: 403 });
      }

      // Update existing session
      chatSession = await prisma.chatSession.update({
        where: { id },
        data: {
          label: label || "Untitled Session",
          messages,
          sessionStats,
          selectedModelId,
          selectedRegion,
          carbonBudget,
          resilienceHistory,
          ciSource,
          ciFactorType,
          ciZoneLabel,
          ciIsRepresentativeZone,
          greenHours,
          advisorSupplementalInput,
          advisorDraft,
          advisorQAHistory,
          sessionStartTime,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new session
      chatSession = await prisma.chatSession.create({
        data: {
          userId: user.id,
          label: label || "Untitled Session",
          messages,
          sessionStats,
          selectedModelId,
          selectedRegion,
          carbonBudget,
          resilienceHistory,
          ciSource,
          ciFactorType,
          ciZoneLabel,
          ciIsRepresentativeZone,
          greenHours,
          advisorSupplementalInput,
          advisorDraft,
          advisorQAHistory,
          sessionStartTime,
        },
      });
    }

    return NextResponse.json(chatSession);
  } catch (error) {
    console.error("[API] Error saving chat session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
