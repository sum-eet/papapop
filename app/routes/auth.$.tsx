import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🔐 AUTH CALLBACK STARTED");
  console.log("Auth request URL:", request.url);
  
  try {
    console.log("🔑 Processing authentication...");
    await authenticate.admin(request);
    console.log("✅ Authentication successful - redirecting to app");
    
    // After successful auth, redirect to the app
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/app"
      }
    });
    
  } catch (error) {
    console.error("❌ AUTH CALLBACK ERROR:", error);
    
    // If auth fails, redirect back to install
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/"
      }
    });
  }
};
