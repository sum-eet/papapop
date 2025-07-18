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
      event,
      sessionId,
      timestamp,
      pageUrl,
      pageType,
      deviceType,
      stepNumber,
      timeToAction,
      timeToShow,
      ...additionalData
    } = data;

    // Validate required fields
    if (!popupId || !event || !sessionId) {
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
          deviceType: deviceType || "unknown",
          firstVisit: new Date(timestamp),
          lastActivity: new Date(timestamp),
        }
      });
    } else {
      // Update last activity
      await prisma.userSession.update({
        where: { sessionId },
        data: {
          lastActivity: new Date(timestamp),
          deviceType: deviceType || userSession.deviceType,
        }
      });
    }

    // Save analytics event
    const analyticsEvent = await prisma.popupAnalytics.create({
      data: {
        popupId,
        sessionId,
        event,
        stepNumber,
        pageUrl: pageUrl || "",
        pageType,
        deviceType,
        timeToAction,
        timeToShow,
        timestamp: new Date(timestamp)
      }
    });

    // Update popup view count for view events
    if (event === 'view') {
      await prisma.popup.update({
        where: { id: popupId },
        data: {
          views: { increment: 1 }
        }
      });
    }

    return json({ 
      success: true, 
      id: analyticsEvent.id,
      message: "Event tracked successfully" 
    });

  } catch (error) {
    console.error("Error tracking event:", error);
    return json({ 
      error: "Failed to track event" 
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