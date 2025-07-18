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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Get all popups for the shop with analytics (excluding deleted)
    const popups = await prisma.popup.findMany({
      where: { shop, isDeleted: false },
      include: {
        _count: {
          select: {
            analytics: true,
            emailCaptures: true,
            quizResponses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return json({ popups });
  } catch (error) {
    console.error("Popups loader error:", error);
    return json({ popups: [] });
  }
};

export default function PopupsList() {
  const { popups } = useLoaderData<typeof loader>();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge tone="success">Active</Badge> : 
      <Badge tone="critical">Inactive</Badge>;
  };

  const getTriggerBadge = (triggerType: string) => {
    switch (triggerType) {
      case "delay":
        return <Badge tone="info">Time Delay</Badge>;
      case "scroll":
        return <Badge tone="attention">Scroll %</Badge>;
      case "exit":
        return <Badge tone="warning">Exit Intent</Badge>;
      default:
        return <Badge>{triggerType}</Badge>;
    }
  };

  const getTypeBadge = (popupType: string) => {
    return popupType === "multi_step" ? 
      <Badge tone="magic">Multi-Step</Badge> : 
      <Badge tone="info">Single Step</Badge>;
  };

  const getConversionRate = (views: number, conversions: number) => {
    if (views === 0) return "0%";
    return ((conversions / views) * 100).toFixed(1) + "%";
  };

  const popupRows = popups.map((popup) => [
    popup.title,
    getStatusBadge(popup.isActive),
    getTypeBadge(popup.popupType),
    getTriggerBadge(popup.triggerType),
    popup.views.toString(),
    popup.conversions.toString(),
    getConversionRate(popup.views, popup.conversions),
    popup._count.emailCaptures.toString(),
    formatDate(popup.createdAt),
    (
      <ButtonGroup>
        <Button size="slim" url={`/app/popups/${popup.id}`} as={RemixLink}>
          View
        </Button>
        <Button size="slim" url={`/app/popups/${popup.id}/edit`} as={RemixLink}>
          Edit
        </Button>
        <Button 
          size="slim" 
          variant={popup.isActive ? "primary" : "secondary"}
          tone={popup.isActive ? "success" : undefined}
        >
          {popup.isActive ? "Active" : "Disabled"}
        </Button>
      </ButtonGroup>
    ),
  ]);

  return (
    <Page>
      <TitleBar title="All Popups">
        <Button variant="primary" url="/app/popups/new" as={RemixLink}>
          Create New Popup
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Your Popups ({popups.length})
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Manage all your popup campaigns
              </Text>
            </InlineStack>
            
            {popups.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  "text", "text", "text", "text", 
                  "numeric", "numeric", "text", "numeric", 
                  "text", "text"
                ]}
                headings={[
                  "Title", "Status", "Type", "Trigger", 
                  "Views", "Conversions", "Conv. Rate", "Emails", 
                  "Created", "Actions"
                ]}
                rows={popupRows}
              />
            ) : (
              <EmptyState
                heading="No popups yet"
                action={{
                  content: "Create your first popup",
                  url: "/app/popups/new",
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Create your first popup to start capturing leads and boosting conversions.</p>
              </EmptyState>
            )}
          </BlockStack>
        </Card>

        {/* Quick Stats */}
        {popups.length > 0 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Quick Stats
              </Text>
              <InlineStack gap="400">
                <div>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Total Views
                  </Text>
                  <Text as="p" variant="headingLg">
                    {popups.reduce((sum, popup) => sum + popup.views, 0).toLocaleString()}
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Total Conversions
                  </Text>
                  <Text as="p" variant="headingLg">
                    {popups.reduce((sum, popup) => sum + popup.conversions, 0).toLocaleString()}
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Total Emails
                  </Text>
                  <Text as="p" variant="headingLg">
                    {popups.reduce((sum, popup) => sum + popup._count.emailCaptures, 0).toLocaleString()}
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Active Popups
                  </Text>
                  <Text as="p" variant="headingLg">
                    {popups.filter(popup => popup.isActive).length}
                  </Text>
                </div>
              </InlineStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}