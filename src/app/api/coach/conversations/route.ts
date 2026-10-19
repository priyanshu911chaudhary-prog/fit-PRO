import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { CoachConversation } from "@/models/coachConversation";
import { createConversationSchema } from "@/validators/coach.validator";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;

    const conversations = await CoachConversation.find({ user: userId })
      .sort({ updatedAt: -1 })
      .select("title messages createdAt updatedAt")
      .lean();

    const summaryList = conversations.map((conv) => {
      const lastMsg =
        conv.messages && conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1]
          : null;

      return {
        _id: conv._id.toString(),
        title: conv.title || "New Chat",
        messageCount: conv.messages ? conv.messages.length : 0,
        lastMessage: lastMsg
          ? {
              role: lastMsg.role,
              content:
                lastMsg.content.length > 100
                  ? `${lastMsg.content.slice(0, 100)}...`
                  : lastMsg.content,
              createdAt: lastMsg.createdAt,
            }
          : null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json(
      new ApiResponse(200, "Conversations retrieved successfully", {
        conversations: summaryList,
      }),
      { status: 200 }
    );
  })
);

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;
    const body = await validateBody(req, createConversationSchema).catch(() => ({}));

    const title = (body as { title?: string }).title?.trim() || "New Chat";
    const initialMessage = (body as { initialMessage?: string }).initialMessage?.trim();

    const messages = initialMessage
      ? [
          {
            role: "user" as const,
            content: initialMessage,
            createdAt: new Date(),
          },
        ]
      : [];

    const conversation = await CoachConversation.create({
      user: userId,
      title,
      messages,
    });

    return NextResponse.json(
      new ApiResponse(201, "Conversation created successfully", {
        conversation: {
          _id: conversation._id.toString(),
          title: conversation.title,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      }),
      { status: 201 }
    );
  })
);
