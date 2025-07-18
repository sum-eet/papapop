import { useState, useCallback } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
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
  Divider,
  Badge,
  ButtonGroup,
  Icon,
  Banner,
  Box,
  Grid,
  Collapsible,
} from "@shopify/polaris";
import {
  DragHandleIcon,
  DeleteIcon,
  PlusIcon,
  QuestionCircleIcon,
  EmailIcon,
  GiftCardIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🚀 POPUP CREATION ACTION STARTED");
  console.log("Request method:", request.method);
  console.log("Request URL:", request.url);
  console.log("Request headers:", Object.fromEntries(request.headers.entries()));
  
  try {
    console.log("🔐 Starting authentication...");
    const { session } = await authenticate.admin(request);
    console.log("✅ Authentication successful");
    console.log("Session object:", {
      shop: session.shop,
      id: session.id,
      state: session.state,
      scope: session.scope,
      isOnline: session.isOnline,
      expires: session.expires,
      accessToken: session.accessToken ? "***EXISTS***" : "MISSING"
    });
    
    const shop = session.shop;
    console.log("🏪 Shop identified:", shop);
    
    console.log("📋 Parsing form data...");
    const formData = await request.formData();
    console.log("Form data entries:", Object.fromEntries(formData.entries()));
    
    console.log("🎯 Creating popup data object...");
    const popupData = {
      shop,
      title: String(formData.get("title") || ""),
      popupType: String(formData.get("popupType") || "single_step"),
      triggerType: String(formData.get("triggerType") || "delay"),
      triggerValue: parseInt(String(formData.get("triggerValue") || "3"), 10),
      heading: String(formData.get("heading") || ""),
      description: formData.get("description") ? String(formData.get("description")) : null,
      buttonText: String(formData.get("buttonText") || "Get Started"),
      discountCode: formData.get("discountCode") ? String(formData.get("discountCode")) : null,
      steps: formData.get("steps") ? JSON.parse(String(formData.get("steps"))) : null,
      position: String(formData.get("position") || "center"),
      targetPages: formData.get("targetPages") ? JSON.parse(String(formData.get("targetPages"))) : ["homepage"],
      targetDevices: formData.get("targetDevices") ? JSON.parse(String(formData.get("targetDevices"))) : ["desktop", "mobile"],
      isActive: true,
      isDeleted: false,
    };
    console.log("📊 Popup data prepared:", popupData);
    
    console.log("💾 Saving to database...");
    const popup = await prisma.popup.create({
      data: popupData,
    });
    console.log("✅ Popup created successfully:", popup.id);
    
    console.log("🔄 Redirecting to /app/popups");
    return redirect(`/app/popups`);
    
  } catch (error) {
    console.error("❌ POPUP CREATION ERROR:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    if (error.message?.includes("redirect") || error.message?.includes("auth")) {
      console.error("🔐 AUTHENTICATION ERROR DETECTED");
      console.error("This might be an auth redirect issue");
    }
    
    return json({ error: "Failed to create popup" }, { status: 500 });
  }
};

const STEP_TYPES = [
  { label: "Quiz/Poll", value: "quiz", icon: QuestionCircleIcon },
  { label: "Email Capture", value: "email", icon: EmailIcon },
  { label: "Discount Reveal", value: "discount", icon: GiftCardIcon },
  { label: "Thank You", value: "thankyou", icon: CheckIcon },
];

const QUIZ_TEMPLATES = [
  {
    id: "shopping_intent",
    name: "Shopping Intent",
    question: "What are you shopping for today?",
    answers: ["Apparel", "Home & Garden", "Beauty", "Gifts", "Electronics"],
    selectionType: "single",
  },
  {
    id: "audience",
    name: "Audience Segmentation",
    question: "Which best describes you?",
    answers: ["First-time visitor", "Returning customer", "VIP member", "Looking for deals"],
    selectionType: "single",
  },
  {
    id: "budget_range",
    name: "Budget Range",
    question: "What's your budget range?",
    answers: ["Under $50", "$50-$100", "$100-$200", "$200+"],
    selectionType: "single",
  },
];

const TRIGGER_OPTIONS = [
  { label: "Time Delay", value: "delay" },
  { label: "Scroll Percentage", value: "scroll" },
  { label: "Exit Intent", value: "exit" },
  { label: "Page Specific", value: "page_specific" },
];

const POSITION_OPTIONS = [
  { label: "Center", value: "center" },
  { label: "Bottom", value: "bottom" },
  { label: "Top", value: "top" },
  { label: "Side", value: "side" },
];

export default function NewPopup() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  // Log navigation state changes
  console.log("📊 Navigation state:", navigation.state);
  console.log("📊 Action data:", actionData);
  console.log("📊 Is submitting:", isSubmitting);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    popupType: "single_step",
    triggerType: "delay",
    triggerValue: 3,
    heading: "",
    description: "",
    buttonText: "Get Started",
    discountCode: "",
    position: "center",
    targetPages: ["homepage"],
    targetDevices: ["desktop", "mobile"],
  });

  // Step builder state
  const [steps, setSteps] = useState([
    {
      id: Date.now(),
      type: "quiz",
      order: 1,
      config: {
        question: "",
        answers: ["", ""],
        selectionType: "single",
        required: true,
        autoAdvance: true,
      },
    },
  ]);

  const [expandedSteps, setExpandedSteps] = useState({});

  // Form handlers
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleArrayInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Step management
  const addStep = useCallback(() => {
    if (steps.length >= 4) return;
    
    const newStep = {
      id: Date.now(),
      type: "quiz",
      order: steps.length + 1,
      config: {
        question: "",
        answers: ["", ""],
        selectionType: "single",
        required: true,
        autoAdvance: true,
      },
    };
    
    setSteps(prev => [...prev, newStep]);
    setExpandedSteps(prev => ({ ...prev, [newStep.id]: true }));
  }, [steps.length]);

  const removeStep = useCallback((stepId: number) => {
    setSteps(prev => prev.filter(step => step.id !== stepId));
    setExpandedSteps(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[stepId];
      return newExpanded;
    });
  }, []);

  const updateStep = useCallback((stepId: number, updates: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  }, []);

  const updateStepConfig = useCallback((stepId: number, configUpdates: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, config: { ...step.config, ...configUpdates } }
        : step
    ));
  }, []);

  const applyQuizTemplate = useCallback((stepId: number, template: any) => {
    updateStepConfig(stepId, {
      question: template.question,
      answers: template.answers,
      selectionType: template.selectionType,
    });
  }, [updateStepConfig]);

  const toggleStepExpansion = useCallback((stepId: number) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  // Answer management for quiz steps
  const addAnswer = useCallback((stepId: number) => {
    const step = steps.find(s => s.id === stepId);
    if (step && step.config.answers.length < 6) {
      updateStepConfig(stepId, {
        answers: [...step.config.answers, ""],
      });
    }
  }, [steps, updateStepConfig]);

  const removeAnswer = useCallback((stepId: number, answerIndex: number) => {
    const step = steps.find(s => s.id === stepId);
    if (step && step.config.answers.length > 2) {
      const newAnswers = step.config.answers.filter((_, index) => index !== answerIndex);
      updateStepConfig(stepId, { answers: newAnswers });
    }
  }, [steps, updateStepConfig]);

  const updateAnswer = useCallback((stepId: number, answerIndex: number, value: string) => {
    const step = steps.find(s => s.id === stepId);
    if (step) {
      const newAnswers = [...step.config.answers];
      newAnswers[answerIndex] = value;
      updateStepConfig(stepId, { answers: newAnswers });
    }
  }, [steps, updateStepConfig]);

  // Step type specific renderers
  const renderStepConfig = (step: any) => {
    switch (step.type) {
      case "quiz":
        return renderQuizStepConfig(step);
      case "email":
        return renderEmailStepConfig(step);
      case "discount":
        return renderDiscountStepConfig(step);
      case "thankyou":
        return renderThankYouStepConfig(step);
      default:
        return null;
    }
  };

  const renderQuizStepConfig = (step: any) => (
    <BlockStack gap="400">
      <FormLayout>
        <TextField
          label="Question"
          value={step.config.question}
          onChange={(value) => updateStepConfig(step.id, { question: value })}
          placeholder="What are you shopping for?"
          helpText="Ask a clear, engaging question"
        />
        
        <Select
          label="Selection Type"
          options={[
            { label: "Single Choice (Radio)", value: "single" },
            { label: "Multiple Choice (Checkboxes)", value: "multiple" },
          ]}
          value={step.config.selectionType}
          onChange={(value) => updateStepConfig(step.id, { selectionType: value })}
        />

        <Box>
          <Text as="h4" variant="headingSm">Quiz Templates</Text>
          <Box paddingBlockStart="200">
            <ButtonGroup>
              {QUIZ_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  size="slim"
                  onClick={() => applyQuizTemplate(step.id, template)}
                >
                  {template.name}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
        </Box>

        <Box>
          <InlineStack align="space-between">
            <Text as="h4" variant="headingSm">Answer Options</Text>
            <Button
              size="slim"
              icon={PlusIcon}
              onClick={() => addAnswer(step.id)}
              disabled={step.config.answers.length >= 6}
            >
              Add Answer
            </Button>
          </InlineStack>
          <Box paddingBlockStart="200">
            <BlockStack gap="200">
              {step.config.answers.map((answer, index) => (
                <InlineStack key={index} gap="200" align="center">
                  <Box style={{ flexGrow: 1 }}>
                    <TextField
                      value={answer}
                      onChange={(value) => updateAnswer(step.id, index, value)}
                      placeholder={`Answer ${index + 1}`}
                    />
                  </Box>
                  <Button
                    size="slim"
                    icon={DeleteIcon}
                    onClick={() => removeAnswer(step.id, index)}
                    disabled={step.config.answers.length <= 2}
                  />
                </InlineStack>
              ))}
            </BlockStack>
          </Box>
        </Box>

        <Checkbox
          label="Auto-advance to next step on selection"
          checked={step.config.autoAdvance}
          onChange={(checked) => updateStepConfig(step.id, { autoAdvance: checked })}
          helpText="For single choice questions, automatically proceed when user selects an answer"
        />

        <Checkbox
          label="Required question"
          checked={step.config.required}
          onChange={(checked) => updateStepConfig(step.id, { required: checked })}
        />
      </FormLayout>
    </BlockStack>
  );

  const renderEmailStepConfig = (step: any) => (
    <FormLayout>
      <TextField
        label="Heading"
        value={step.config.heading || ""}
        onChange={(value) => updateStepConfig(step.id, { heading: value })}
        placeholder="Get your personalized discount!"
      />
      
      <TextField
        label="Description"
        value={step.config.description || ""}
        onChange={(value) => updateStepConfig(step.id, { description: value })}
        placeholder="Enter your email to receive your custom offer"
        multiline={3}
      />
      
      <Checkbox
        label="Collect name (optional)"
        checked={step.config.collectName || false}
        onChange={(checked) => updateStepConfig(step.id, { collectName: checked })}
        helpText="Ask for first name in addition to email"
      />
    </FormLayout>
  );

  const renderDiscountStepConfig = (step: any) => (
    <FormLayout>
      <TextField
        label="Celebration Message"
        value={step.config.message || ""}
        onChange={(value) => updateStepConfig(step.id, { message: value })}
        placeholder="🎉 Here's your personalized discount!"
      />
      
      <TextField
        label="Default Discount Code"
        value={step.config.discountCode || ""}
        onChange={(value) => updateStepConfig(step.id, { discountCode: value })}
        placeholder="SAVE15"
        helpText="Default code if no quiz-based logic applies"
      />
      
      <Checkbox
        label="Dynamic discount based on quiz answers"
        checked={step.config.dynamicDiscount || false}
        onChange={(checked) => updateStepConfig(step.id, { dynamicDiscount: checked })}
        helpText="Show different discounts based on quiz responses"
      />
    </FormLayout>
  );

  const renderThankYouStepConfig = (step: any) => (
    <FormLayout>
      <TextField
        label="Thank You Message"
        value={step.config.message || ""}
        onChange={(value) => updateStepConfig(step.id, { message: value })}
        placeholder="Thank you! Check your email for your discount."
        multiline={3}
      />
      
      <TextField
        label="Redirect URL (optional)"
        value={step.config.redirectUrl || ""}
        onChange={(value) => updateStepConfig(step.id, { redirectUrl: value })}
        placeholder="https://yourstore.com/collection/sale"
        helpText="Where to redirect after popup closes"
      />
    </FormLayout>
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    console.log("🎯 FORM SUBMIT STARTED (CLIENT-SIDE)");
    console.log("Form data state:", formData);
    console.log("Steps data:", steps);
    console.log("Current URL:", window.location.href);
    console.log("User agent:", navigator.userAgent);
    
    event.preventDefault();
    const form = event.currentTarget;
    const formDataObj = new FormData(form);
    
    // Add steps data
    formDataObj.set("steps", JSON.stringify(steps));
    formDataObj.set("targetPages", JSON.stringify(formData.targetPages));
    formDataObj.set("targetDevices", JSON.stringify(formData.targetDevices));
    
    console.log("📋 Final form data being submitted:");
    for (const [key, value] of formDataObj.entries()) {
      console.log(`  ${key}:`, value);
    }
    
    console.log("🚀 Submitting form...");
    // Submit form
    form.submit();
  };

  return (
    <Page>
      <TitleBar title="Create New Popup" />
      
      <Form method="post" onSubmit={handleSubmit}>
        <BlockStack gap="500">
          {actionData?.error && (
            <Banner status="critical">{actionData.error}</Banner>
          )}

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
                  placeholder="My Awesome Popup"
                  required
                />
                
                <TextField
                  label="Heading"
                  name="heading"
                  value={formData.heading}
                  onChange={(value) => handleInputChange("heading", value)}
                  placeholder="Welcome! Get 15% off your first order"
                  required
                />
                
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={(value) => handleInputChange("description", value)}
                  placeholder="Take our quick quiz to get a personalized discount"
                  multiline={3}
                />
              </FormLayout>
            </BlockStack>
          </Card>

          {/* Popup Type Selection */}
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

          {/* Multi-Step Builder */}
          {formData.popupType === "multi_step" && (
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Step Builder</Text>
                  <Button
                    icon={PlusIcon}
                    onClick={addStep}
                    disabled={steps.length >= 4}
                  >
                    Add Step
                  </Button>
                </InlineStack>
                
                <Text variant="bodyMd" tone="subdued">
                  Create up to 4 steps for your popup flow. Drag to reorder.
                </Text>

                <BlockStack gap="300">
                  {steps.map((step, index) => (
                    <Card key={step.id} sectioned>
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <InlineStack gap="200" align="center">
                            <Icon source={DragHandleIcon} />
                            <Badge tone="info">Step {index + 1}</Badge>
                            <Select
                              options={STEP_TYPES.map(type => ({
                                label: type.label,
                                value: type.value,
                              }))}
                              value={step.type}
                              onChange={(value) => updateStep(step.id, { type: value })}
                            />
                          </InlineStack>
                          <ButtonGroup>
                            <Button
                              size="slim"
                              onClick={() => toggleStepExpansion(step.id)}
                            >
                              {expandedSteps[step.id] ? "Collapse" : "Expand"}
                            </Button>
                            <Button
                              size="slim"
                              icon={DeleteIcon}
                              onClick={() => removeStep(step.id)}
                              disabled={steps.length <= 1}
                            />
                          </ButtonGroup>
                        </InlineStack>
                        
                        <Collapsible
                          open={expandedSteps[step.id]}
                          id={`step-${step.id}`}
                          transition={{ duration: "200ms", timingFunction: "ease-in-out" }}
                        >
                          <Box paddingBlockStart="300">
                            {renderStepConfig(step)}
                          </Box>
                        </Collapsible>
                      </BlockStack>
                    </Card>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          )}

          {/* Trigger & Display Settings */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Trigger & Display</Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
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
                  </FormLayout>
                </Grid.Cell>
                
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <FormLayout>
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
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Card>

          {/* Submit */}
          <InlineStack align="end">
            <ButtonGroup>
              <Button url="/app/popups">Cancel</Button>
              <Button
                variant="primary"
                submit
                loading={isSubmitting}
              >
                Create Popup
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