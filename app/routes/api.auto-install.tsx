import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  console.log("🚀 AUTO-INSTALL TRIGGERED");
  
  try {
    // Force authentication with script tag permissions
    const { admin, session } = await authenticate.admin(request);
    
    console.log("✅ Authentication successful, shop:", session.shop);
    
    // Delete any existing script tags first
    console.log("🗑️ Cleaning up old script tags...");
    const existingScriptTags = await admin.rest.resources.ScriptTag.all({ session });
    
    for (const tag of existingScriptTags.data) {
      if (tag.src && (tag.src.includes('papapop') || tag.src.includes('smartpop'))) {
        console.log("🗑️ Deleting old script tag:", tag.id);
        const deleteTag = new admin.rest.resources.ScriptTag({ session });
        deleteTag.id = tag.id;
        await deleteTag.delete();
      }
    }
    
    // Install GOD MODE script
    console.log("🚀 Installing GOD MODE script...");
    const scriptTag = new admin.rest.resources.ScriptTag({ session });
    scriptTag.event = 'onload';
    scriptTag.src = 'https://papapop.vercel.app/godmode-popup.js';
    scriptTag.display_scope = 'online_store';
    
    await scriptTag.save({ update: true });
    
    console.log("✅ GOD MODE script installed successfully!");
    console.log("Script ID:", scriptTag.id);
    console.log("🚀 Popup is now live on your store!");
    
    return json({ 
      success: true,
      message: "GOD MODE popup installed! Visit your store to see it in action.",
      scriptId: scriptTag.id,
      storeUrl: `https://${session.shop}`
    });
    
  } catch (error) {
    console.error("❌ Auto-install failed:", error);
    return json({ 
      success: false, 
      error: error.message,
      needsPermission: error.message?.includes('write_script_tags')
    });
  }
}

export async function loader() {
  return json({ message: "Use POST to auto-install" });
}