import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestPopup() {
  try {
    const popup = await prisma.popup.create({
      data: {
        shop: "testingstoresumeet.myshopify.com",
        title: "Test Popup - Backend Created",
        popupType: "single_step",
        triggerType: "delay",
        triggerValue: 3,
        heading: "🎉 Welcome to Our Store!",
        description: "Get 15% off your first order when you sign up for our newsletter.",
        buttonText: "Get My Discount",
        discountCode: "WELCOME15",
        position: "center",
        targetPages: ["homepage"],
        targetDevices: ["desktop", "mobile"],
        isActive: true,
        isDeleted: false,
        views: 0,
        conversions: 0
      }
    });

    console.log("✅ Test popup created successfully!");
    console.log("Popup ID:", popup.id);
    console.log("Shop:", popup.shop);
    console.log("Title:", popup.title);
    console.log("Trigger:", popup.triggerType, popup.triggerValue, "seconds");
    console.log("This popup will show after 3 seconds on the homepage");

  } catch (error) {
    console.error("❌ Error creating test popup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPopup();