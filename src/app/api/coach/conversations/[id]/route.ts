import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { CoachConversation } from "@/models/coachConversation";
import { updateConversationSchema } from "@/validators/coach.validator";

export const GET = withHandler(
  withAuth(
    async (
      _req: NextRequest,
      context: { params: Promise<{ id: string }> },
      sessionUser: TokenPayload
    ) => {
      const { id } = await context.params;

      const conversation = await CoachConversation.findOne({
        _id: id,
        user: sessionUser.userId,
      }).lean();

      if (!conversation) {
        throw new ApiError(404, "Conversation not found or unauthorized");
      }

      return NextResponse.json(
        new ApiResponse(200, "Conversation retrieved successfully", {
          conversation: {
            _id: conversation._id.toString(),
            title: conversation.title,
            messages: conversation.messages || [],
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
        }),
        { status: 200 }
      );
    }
  )
);

export const DELETE = withHandler(
  withAuth(
    async (
      _req: NextRequest,
      context: { params: Promise<{ id: string }> },
      sessionUser: TokenPayload
    ) => {
      const { id } = await context.params;

      const deleted = await CoachConversation.findOneAndDelete({
        _id: id,
        user: sessionUser.userId,
      });

      if (!deleted) {
        throw new ApiError(404, "Conversation not found or unauthorized");
      }

      return NextResponse.json(
        new ApiResponse(200, "Conversation deleted successfully", {
          deletedId: id,
        }),
        { status: 200 }
      );
    }
  )
);

export const PATCH = withHandler(
  withAuth(
    async (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
      sessionUser: TokenPayload
    ) => {
      const { id } = await context.params;
      const body = await validateBody(req, updateConversationSchema);

      const conversation = await CoachConversation.findOneAndUpdate(
        {
          _id: id,
          user: sessionUser.userId,
        },
        {
          $set: { title: body.title },
        },
        { new: true }
      ).lean();

      if (!conversation) {
        throw new ApiError(404, "Conversation not found or unauthorized");
      }

      return NextResponse.json(
        new ApiResponse(200, "Conversation updated successfully", {
          conversation: {
            _id: conversation._id.toString(),
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
        }),
        { status: 200 }
      );
    }
  )
);
