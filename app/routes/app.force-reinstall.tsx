import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Try to authenticate - this will force a scope upgrade if needed
    await authenticate.admin(request);
    
    // If we get here, auth worked, redirect to install script
    return redirect("/app/install-script");
    
  } catch (error) {
    console.log("🔄 Authentication failed, triggering OAuth flow...");
    
    // Extract shop from URL or session
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") || "testingstoresumeet.myshopify.com";
    
    // Construct OAuth URL with updated scopes
    const oauthUrl = `https://papapop.vercel.app/auth?shop=${shop}`;
    
    console.log("🔄 Redirecting to OAuth:", oauthUrl);
    return redirect(oauthUrl);
  }
}