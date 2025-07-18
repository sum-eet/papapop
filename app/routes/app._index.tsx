import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  DataTable,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Get key metrics
    const totalPopups = await prisma.popup.count({ where: { shop } });
    const totalViews = await prisma.popup.aggregate({
      where: { shop },
      _sum: { views: true },
    });
    const totalConversions = await prisma.popup.aggregate({
      where: { shop },
      _sum: { conversions: true },
    });
    const totalEmails = await prisma.emailCapture.count({
      where: { popup: { shop } },
    });

    // Get recent activity (last 10 events)
    const recentActivity = await prisma.popupAnalytics.findMany({
      where: { popup: { shop } },
      include: {
        popup: { select: { title: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    // Get recent popups with stats
    const recentPopups = await prisma.popup.findMany({
      where: { shop },
      include: {
        _count: {
          select: {
            analytics: true,
            emailCaptures: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return json({
      metrics: {
        totalPopups,
        totalViews: totalViews._sum.views || 0,
        totalConversions: totalConversions._sum.conversions || 0,
        totalEmails,
      },
      recentActivity,
      recentPopups,
    });
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return json({
      metrics: {
        totalPopups: 0,
        totalViews: 0,
        totalConversions: 0,
        totalEmails: 0,
      },
      recentActivity: [],
      recentPopups: [],
    });
  }
};

export default function Dashboard() {
  const { metrics, recentActivity, recentPopups } = useLoaderData<typeof loader>();

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
      default:
        return <Badge>{event}</Badge>;
    }
  };

  const activityRows = recentActivity.map((activity) => [
    activity.popup.title,
    getEventBadge(activity.event),
    activity.pageUrl,
    formatDate(activity.timestamp),
  ]);

  const popupRows = recentPopups.map((popup) => [
    popup.title,
    popup.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="critical">Inactive</Badge>,
    popup.views.toString(),
    popup.conversions.toString(),
    popup._count.emailCaptures.toString(),
    formatDate(popup.createdAt),
  ]);

  return (
    <Page>
      <TitleBar title="Popup Dashboard">
        <Button variant="primary" url="/app/popups/new" as={RemixLink}>
          Create New Popup
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        {/* Key Metrics */}
        <Layout>
          <Layout.Section>
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd" tone="subdued">
                    Total Popups
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {metrics.totalPopups}
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd" tone="subdued">
                    Total Views
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {metrics.totalViews.toLocaleString()}
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd" tone="subdued">
                    Total Conversions
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {metrics.totalConversions.toLocaleString()}
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd" tone="subdued">
                    Emails Captured
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {metrics.totalEmails.toLocaleString()}
                  </Text>
                </BlockStack>
              </Card>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* Recent Activity */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Recent Activity
                </Text>
                {recentActivity.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text"]}
                    headings={["Popup", "Event", "Page URL", "Time"]}
                    rows={activityRows}
                  />
                ) : (
                  <EmptyState
                    heading="No activity yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Activity will appear here once you create and deploy popups.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Recent Popups */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Recent Popups
                  </Text>
                  <Button url="/app/popups" as={RemixLink}>
                    View All Popups
                  </Button>
                </InlineStack>
                {recentPopups.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "text"]}
                    headings={["Title", "Status", "Views", "Conversions", "Emails", "Created"]}
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
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}