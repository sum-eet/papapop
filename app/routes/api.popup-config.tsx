import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

// Create Prisma client for edge runtime
const prisma = new PrismaClient();

export const config = {
  runtime: "edge",
};

interface PopupConfig {
  id: string;
  popupType: string;
  triggerType: string;
  triggerValue: number;
  heading: string;
  description: string | null;
  buttonText: string;
  discountCode: string | null;
  position: string;
  targetPages: any;
  targetDevices: any;
  repeatInSession: boolean;
  maxViewsPerSession: number;
  steps: any;
  theme: any;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter is required" }, { status: 400 });
  }

  try {
    // Get all active popups for the shop
    const popups = await prisma.popup.findMany({
      where: {
        shop: shop,
        isActive: true,
      },
      select: {
        id: true,
        popupType: true,
        triggerType: true,
        triggerValue: true,
        heading: true,
        description: true,
        buttonText: true,
        discountCode: true,
        position: true,
        targetPages: true,
        targetDevices: true,
        repeatInSession: true,
        maxViewsPerSession: true,
        steps: true,
        theme: true,
      },
    });

    // Format response for minimal payload
    const configs: PopupConfig[] = popups.map((popup) => ({
      id: popup.id,
      popupType: popup.popupType,
      triggerType: popup.triggerType,
      triggerValue: popup.triggerValue,
      heading: popup.heading,
      description: popup.description,
      buttonText: popup.buttonText,
      discountCode: popup.discountCode,
      position: popup.position,
      targetPages: popup.targetPages,
      targetDevices: popup.targetDevices,
      repeatInSession: popup.repeatInSession,
      maxViewsPerSession: popup.maxViewsPerSession,
      steps: popup.steps,
      theme: popup.theme,
    }));

    return json(
      { 
        success: true, 
        configs,
        timestamp: Date.now() 
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=3600",
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching popup configs:", error);
    return json(
      { error: "Failed to fetch popup configurations" },
      { 
        status: 500,
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}