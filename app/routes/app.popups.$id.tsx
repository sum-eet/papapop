import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  BlockStack,
  InlineStack,
  DataTable,
  Badge,
  EmptyState,
  Text,
  ButtonGroup,
  Layout,
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
    // Get popup with all related data
    const popup = await prisma.popup.findFirst({
      where: { id: popupId, shop },
      include: {
        analytics: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
        emailCaptures: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
        quizResponses: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
        _count: {
          select: {
            analytics: true,
            emailCaptures: true,
            quizResponses: true,
          },
        },
      },
    });

    if (!popup) {
      throw new Response("Popup not found", { status: 404 });
    }

    return json({ popup });
  } catch (error) {
    console.error("Popup detail loader error:", error);
    throw new Response("Error loading popup", { status: 500 });
  }
};

export default function PopupDetail() {
  const { popup } = useLoaderData<typeof loader>();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEventBadge = (event: string) => {
    switch (event) {
      case "view":
        return <Badge tone="info">View</Badge>;
      case "conversion":
        return <Badge tone="success">Conversion</Badge>;
      case "close":
        return <Badge tone="attention">Close</Badge>;
      case "interaction":
        return <Badge tone="magic">Interaction</Badge>;
      default:
        return <Badge>{event}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge tone="success">Active</Badge> : 
      <Badge tone="critical">Inactive</Badge>;
  };

  const getConversionRate = () => {
    if (popup.views === 0) return "0%";
    return ((popup.conversions / popup.views) * 100).toFixed(1) + "%";
  };

  const analyticsRows = popup.analytics.map((event) => [
    getEventBadge(event.event),
    event.pageUrl,
    event.deviceType || "Unknown",
    event.pageType || "Unknown",
    formatDate(event.timestamp),
  ]);

  const emailRows = popup.emailCaptures.map((email) => [
    email.email,
    email.firstName || "—",
    email.lastName || "—",
    email.discountGiven || "—",
    formatDate(email.timestamp),
  ]);

  const quizRows = popup.quizResponses.map((response) => [
    response.question,
    Array.isArray(response.selectedAnswers) ? response.selectedAnswers.join(", ") : "—",
    response.stepOrder.toString(),
    formatDate(response.timestamp),
  ]);

  return (
    <Page>
      <TitleBar title={popup.title}>
        <ButtonGroup>
          <Button url={`/app/popups/${popup.id}/edit`} as={RemixLink}>
            Edit Popup
          </Button>
          <Button url="/app/popups" as={RemixLink}>
            Back to Popups
          </Button>
        </ButtonGroup>
      </TitleBar>
      
      <BlockStack gap="500">
        {/* Popup Overview */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Popup Overview
                  </Text>
                  {getStatusBadge(popup.isActive)}
                </InlineStack>
                
                <InlineStack gap="400">
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Type
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {popup.popupType === "multi_step" ? "Multi-Step" : "Single Step"}
                    </Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Trigger
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {popup.triggerType} ({popup.triggerValue}{popup.triggerType === "delay" ? "s" : "%"})
                    </Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Position
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {popup.position}
                    </Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Created
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {formatDate(popup.createdAt)}
                    </Text>
                  </div>
                </InlineStack>

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Heading
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {popup.heading}
                  </Text>
                </BlockStack>

                {popup.description && (
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Description
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {popup.description}
                    </Text>
                  </BlockStack>
                )}

                {popup.discountCode && (
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Discount Code
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {popup.discountCode}
                    </Text>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Performance Metrics */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Performance Metrics
                </Text>
                <InlineStack gap="400">
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Total Views
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {popup.views.toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Conversions
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {popup.conversions.toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Conversion Rate
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {getConversionRate()}
                    </Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Emails Captured
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {popup._count.emailCaptures.toLocaleString()}
                    </Text>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Recent Analytics */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Recent Activity
                </Text>
                {popup.analytics.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text"]}
                    headings={["Event", "Page URL", "Device", "Page Type", "Time"]}
                    rows={analyticsRows}
                  />
                ) : (
                  <EmptyState
                    heading="No activity yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Activity will appear here once visitors interact with your popup.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Email Captures */}
        {popup.emailCaptures.length > 0 && (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Email Captures ({popup._count.emailCaptures})
                  </Text>
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text"]}
                    headings={["Email", "First Name", "Last Name", "Discount", "Captured"]}
                    rows={emailRows}
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        {/* Quiz Responses */}
        {popup.quizResponses.length > 0 && (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Quiz Responses ({popup._count.quizResponses})
                  </Text>
                  <DataTable
                    columnContentTypes={["text", "text", "numeric", "text"]}
                    headings={["Question", "Answer", "Step", "Responded"]}
                    rows={quizRows}
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}