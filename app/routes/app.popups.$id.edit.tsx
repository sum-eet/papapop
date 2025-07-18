import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  RadioButton,
  Select,
  Checkbox,
  BlockStack,
  InlineStack,
  Text,
  ButtonGroup,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const popupId = params.id;

  if (!popupId) {
    throw new Response("Popup ID is required", { status: 400 });
  }

  try {
    const popup = await prisma.popup.findFirst({
      where: { id: popupId, shop, isDeleted: false },
    });

    if (!popup) {
      throw new Response("Popup not found", { status: 404 });
    }

    return json({ popup });
  } catch (error) {
    console.error("Edit popup loader error:", error);
    throw new Response("Error loading popup", { status: 500 });
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const popupId = params.id;
  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (!popupId) {
    return json({ error: "Popup ID is required" }, { status: 400 });
  }

  try {
    // Handle different actions
    if (actionType === "toggle_active") {
      const popup = await prisma.popup.findFirst({
        where: { id: popupId, shop, isDeleted: false },
      });
      
      if (!popup) {
        return json({ error: "Popup not found" }, { status: 404 });
      }

      await prisma.popup.update({
        where: { id: popupId },
        data: { isActive: !popup.isActive },
      });

      return json({ success: true, message: `Popup ${popup.isActive ? 'disabled' : 'enabled'} successfully` });
    }

    if (actionType === "soft_delete") {
      await prisma.popup.update({
        where: { id: popupId },
        data: { isDeleted: true, isActive: false },
      });

      return redirect("/app/popups");
    }

    // Handle update action
    const popupData = {
      title: String(formData.get("title") || ""),
      popupType: String(formData.get("popupType") || "single_step"),
      triggerType: String(formData.get("triggerType") || "delay"),
      triggerValue: parseInt(String(formData.get("triggerValue") || "3"), 10),
      heading: String(formData.get("heading") || ""),
      description: formData.get("description") ? String(formData.get("description")) : null,
      buttonText: String(formData.get("buttonText") || "Get Started"),
      discountCode: formData.get("discountCode") ? String(formData.get("discountCode")) : null,
      position: String(formData.get("position") || "center"),
      targetPages: formData.get("targetPages") ? JSON.parse(String(formData.get("targetPages"))) : ["homepage"],
      targetDevices: formData.get("targetDevices") ? JSON.parse(String(formData.get("targetDevices"))) : ["desktop", "mobile"],
    };

    await prisma.popup.update({
      where: { id: popupId },
      data: popupData,
    });

    return redirect(`/app/popups/${popupId}`);
  } catch (error) {
    console.error("Failed to update popup:", error);
    return json({ error: "Failed to update popup" }, { status: 500 });
  }
};

const TRIGGER_OPTIONS = [
  { label: "Time Delay", value: "delay" },
  { label: "Scroll Percentage", value: "scroll" },
  { label: "Exit Intent", value: "exit" },
];

const POSITION_OPTIONS = [
  { label: "Center", value: "center" },
  { label: "Bottom", value: "bottom" },
  { label: "Top", value: "top" },
  { label: "Side", value: "side" },
];

export default function EditPopup() {
  const { popup } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state
  const [formData, setFormData] = useState({
    title: popup.title,
    popupType: popup.popupType,
    triggerType: popup.triggerType,
    triggerValue: popup.triggerValue,
    heading: popup.heading,
    description: popup.description || "",
    buttonText: popup.buttonText,
    discountCode: popup.discountCode || "",
    position: popup.position,
    targetPages: popup.targetPages || ["homepage"],
    targetDevices: popup.targetDevices || ["desktop", "mobile"],
  });

  // Form handlers
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    
    // Add form data
    formData.set("targetPages", JSON.stringify(formData.targetPages));
    formData.set("targetDevices", JSON.stringify(formData.targetDevices));
    
    // Submit form
    form.submit();
  };

  return (
    <Page>
      <TitleBar title={`Edit: ${popup.title}`}>
        <ButtonGroup>
          <Button url={`/app/popups/${popup.id}`}>Cancel</Button>
          <Button url="/app/popups">Back to Popups</Button>
        </ButtonGroup>
      </TitleBar>
      
      <Form method="post" onSubmit={handleSubmit}>
        <BlockStack gap="500">
          {actionData?.error && (
            <Banner status="critical">{actionData.error}</Banner>
          )}
          
          {actionData?.success && (
            <Banner status="success">{actionData.message}</Banner>
          )}

          {/* Popup Status Actions */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Popup Actions</Text>
              <InlineStack gap="200">
                <Form method="post">
                  <input type="hidden" name="_action" value="toggle_active" />
                  <Button
                    variant={popup.isActive ? "primary" : "secondary"}
                    submit
                    loading={isSubmitting}
                  >
                    {popup.isActive ? "Disable Popup" : "Enable Popup"}
                  </Button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="_action" value="soft_delete" />
                  <Button
                    variant="primary"
                    tone="critical"
                    submit
                    loading={isSubmitting}
                  >
                    Delete Popup
                  </Button>
                </Form>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Basic Information */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Basic Information</Text>
              <FormLayout>
                <TextField
                  label="Popup Title"
                  name="title"
                  value={formData.title}
                  onChange={(value) => handleInputChange("title", value)}
                  required
                />
                
                <TextField
                  label="Heading"
                  name="heading"
                  value={formData.heading}
                  onChange={(value) => handleInputChange("heading", value)}
                  required
                />
                
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={(value) => handleInputChange("description", value)}
                  multiline={3}
                />
              </FormLayout>
            </BlockStack>
          </Card>

          {/* Popup Type */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Popup Type</Text>
              <BlockStack gap="200">
                <RadioButton
                  label="Single Step Popup"
                  name="popupType"
                  checked={formData.popupType === "single_step"}
                  onChange={() => handleInputChange("popupType", "single_step")}
                />
                <RadioButton
                  label="Multi-Step Popup (with Quiz)"
                  name="popupType"
                  checked={formData.popupType === "multi_step"}
                  onChange={() => handleInputChange("popupType", "multi_step")}
                />
              </BlockStack>
            </BlockStack>
          </Card>

          {/* Trigger & Display Settings */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Trigger & Display</Text>
              <FormLayout>
                <Select
                  label="Trigger Type"
                  name="triggerType"
                  options={TRIGGER_OPTIONS}
                  value={formData.triggerType}
                  onChange={(value) => handleInputChange("triggerType", value)}
                />
                
                <TextField
                  label={formData.triggerType === "delay" ? "Delay (seconds)" : "Scroll (%)"}
                  name="triggerValue"
                  type="number"
                  value={formData.triggerValue.toString()}
                  onChange={(value) => handleInputChange("triggerValue", parseInt(value) || 0)}
                />
                
                <Select
                  label="Position"
                  name="position"
                  options={POSITION_OPTIONS}
                  value={formData.position}
                  onChange={(value) => handleInputChange("position", value)}
                />
                
                <TextField
                  label="Button Text"
                  name="buttonText"
                  value={formData.buttonText}
                  onChange={(value) => handleInputChange("buttonText", value)}
                />
                
                <TextField
                  label="Discount Code (optional)"
                  name="discountCode"
                  value={formData.discountCode}
                  onChange={(value) => handleInputChange("discountCode", value)}
                  placeholder="SAVE15"
                />
              </FormLayout>
            </BlockStack>
          </Card>

          {/* Submit */}
          <InlineStack align="end">
            <ButtonGroup>
              <Button url={`/app/popups/${popup.id}`}>Cancel</Button>
              <Button
                variant="primary"
                submit
                loading={isSubmitting}
              >
                Update Popup
              </Button>
            </ButtonGroup>
          </InlineStack>
        </BlockStack>
        
        {/* Hidden fields */}
        <input type="hidden" name="popupType" value={formData.popupType} />
        <input type="hidden" name="triggerType" value={formData.triggerType} />
        <input type="hidden" name="triggerValue" value={formData.triggerValue} />
        <input type="hidden" name="position" value={formData.position} />
        <input type="hidden" name="targetPages" value={JSON.stringify(formData.targetPages)} />
        <input type="hidden" name="targetDevices" value={JSON.stringify(formData.targetDevices)} />
      </Form>
    </Page>
  );
}