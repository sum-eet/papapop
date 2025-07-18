import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

// Create Prisma client for API routes
const prisma = new PrismaClient();

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const data = await request.json();
    const {
      popupId,
      sessionId,
      questionId,
      question,
      selectedAnswers,
      responseTime,
      stepOrder,
      timestamp
    } = data;

    // Validate required fields
    if (!popupId || !sessionId || !questionId || !question || !selectedAnswers) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure user session exists
    let userSession = await prisma.userSession.findUnique({
      where: { sessionId }
    });

    if (!userSession) {
      // Create user session if it doesn't exist
      userSession = await prisma.userSession.create({
        data: {
          sessionId,
          shop: "", // Will be updated when we have shop context
          deviceType: "unknown",
          firstVisit: new Date(timestamp),
          lastActivity: new Date(timestamp),
        }
      });
    }

    // Save quiz response
    const quizResponse = await prisma.quizResponse.create({
      data: {
        popupId,
        sessionId,
        questionId,
        question,
        selectedAnswers,
        responseTime,
        stepOrder,
        timestamp: new Date(timestamp)
      }
    });

    return json({ 
      success: true, 
      id: quizResponse.id,
      message: "Quiz response saved successfully" 
    });

  } catch (error) {
    console.error("Error saving quiz response:", error);
    return json({ 
      error: "Failed to save quiz response" 
    }, { status: 500 });
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}