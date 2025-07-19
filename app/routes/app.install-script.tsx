import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  BlockStack,
  Text,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    console.log("🔧 Installing script tag for shop:", session.shop);
    
    // Check if script tag already exists
    const existingScriptTags = await admin.rest.resources.ScriptTag.all({
      session,
    });
    
    const scriptUrl = 'https://papapop.vercel.app/godmode-popup.js';
    const existingScript = existingScriptTags.data.find(
      (tag: any) => tag.src === scriptUrl
    );
    
    if (existingScript) {
      console.log("⚠️ Script tag already exists");
      return json({ 
        success: true, 
        message: "Script tag already installed!",
        scriptId: existingScript.id
      });
    }
    
    // Create new script tag
    const scriptTag = new admin.rest.resources.ScriptTag({ session });
    scriptTag.event = 'onload';
    scriptTag.src = scriptUrl;
    scriptTag.display_scope = 'online_store';
    
    await scriptTag.save({
      update: true,
    });
    
    console.log("✅ Script tag installed successfully:", scriptTag.id);
    
    return json({ 
      success: true, 
      message: "Popup script installed successfully! Your popups are now live on your store.",
      scriptId: scriptTag.id
    });
    
  } catch (error) {
    console.error("❌ Error installing script tag:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to install script tag"
    });
  }
};

export default function InstallScript() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Page>
      <TitleBar title="Install Popup Script" />
      
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner status="success">
            <p>{actionData.message}</p>
            {actionData.scriptId && (
              <p><strong>Script ID:</strong> {actionData.scriptId}</p>
            )}
          </Banner>
        )}
        
        {actionData?.error && (
          <Banner status="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}
        
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Install Popup Script on Your Store
            </Text>
            
            <Text as="p" variant="bodyMd">
              This will add the PapaPop script to your Shopify store so that popups can display on your website.
            </Text>
            
            <Text as="p" variant="bodyMd" tone="subdued">
              <strong>What this does:</strong>
            </Text>
            
            <ul>
              <li>Adds a script tag to your store that loads on every page</li>
              <li>Enables popups to display based on your configured triggers</li>
              <li>Allows email capture and analytics tracking</li>
              <li>Script URL: https://papapop.vercel.app/godmode-popup.js</li>
            </ul>
            
            <Form method="post">
              <InlineStack align="end">
                <Button
                  variant="primary"
                  submit
                  loading={isSubmitting}
                  size="large"
                >
                  {isSubmitting ? "Installing..." : "Install Script Tag"}
                </Button>
              </InlineStack>
            </Form>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              ⚠️ Important Notes
            </Text>
            
            <ul>
              <li>You need to have at least one active popup created</li>
              <li>The script will only show popups that match page and device targeting</li>
              <li>Check your browser console for debugging information</li>
              <li>The script loads asynchronously and won't slow down your store</li>
            </ul>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}