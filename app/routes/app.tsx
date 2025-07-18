import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🏠 APP LAYOUT LOADER STARTED");
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);
  
  try {
    console.log("🔐 Authenticating admin in app layout...");
    const { session } = await authenticate.admin(request);
    console.log("✅ App layout authentication successful");
    console.log("Session in app layout:", {
      shop: session.shop,
      id: session.id,
      state: session.state,
      isOnline: session.isOnline,
      expires: session.expires,
      accessToken: session.accessToken ? "***EXISTS***" : "MISSING"
    });
    
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    console.error("❌ APP LAYOUT AUTH ERROR:", error);
    throw error;
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  // Add global error handler
  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      console.error("🚨 GLOBAL ERROR:", event.error);
      console.error("Error details:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    window.addEventListener("unhandledrejection", (event) => {
      console.error("🚨 UNHANDLED PROMISE REJECTION:", event.reason);
    });
  }

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/popups">Popups</Link>
        <Link to="/app/popups/new">Create Popup</Link>
        <Link to="/app/install-script">Install Script</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
