import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🔐 AUTH CALLBACK STARTED");
  console.log("Auth request URL:", request.url);
  console.log("Auth request method:", request.method);
  console.log("Auth request headers:", Object.fromEntries(request.headers.entries()));
  
  try {
    console.log("🔑 Processing authentication...");
    const result = await authenticate.admin(request);
    console.log("✅ Authentication processed successfully");
    console.log("Auth result:", result);
    
    return null;
  } catch (error) {
    console.error("❌ AUTH CALLBACK ERROR:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};
