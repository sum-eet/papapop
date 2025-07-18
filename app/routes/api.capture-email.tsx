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
      email,
      firstName,
      lastName,
      quizData,
      discountGiven,
      timestamp
    } = data;

    // Validate required fields
    if (!popupId || !sessionId || !email) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: "Invalid email format" }, { status: 400 });
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

    // Check if email already exists for this popup
    const existingCapture = await prisma.emailCapture.findFirst({
      where: {
        popupId,
        email
      }
    });

    if (existingCapture) {
      return json({ 
        success: true, 
        id: existingCapture.id,
        message: "Email already captured for this popup" 
      });
    }

    // Save email capture
    const emailCapture = await prisma.emailCapture.create({
      data: {
        popupId,
        sessionId,
        email,
        firstName,
        lastName,
        quizData,
        discountGiven,
        timestamp: new Date(timestamp)
      }
    });

    // Update popup conversion count
    await prisma.popup.update({
      where: { id: popupId },
      data: {
        conversions: { increment: 1 }
      }
    });

    return json({ 
      success: true, 
      id: emailCapture.id,
      message: "Email captured successfully" 
    });

  } catch (error) {
    console.error("Error capturing email:", error);
    return json({ 
      error: "Failed to capture email" 
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