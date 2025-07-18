import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function installScriptTag() {
  try {
    // Get the session from the database
    const session = await prisma.session.findFirst({
      where: { shop: 'testingstoresumeet.myshopify.com' }
    });

    if (!session) {
      console.error('❌ No session found for the shop');
      return;
    }

    console.log('📋 Found session for shop:', session.shop);

    // Create the script tag using Shopify Admin API
    const scriptTagData = {
      script_tag: {
        event: 'onload',
        src: 'https://papapop.vercel.app/popup-script.js',
        display_scope: 'online_store'
      }
    };

    const response = await fetch(`https://${session.shop}/admin/api/2023-04/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify(scriptTagData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Script tag installed successfully!');
      console.log('Script tag ID:', result.script_tag.id);
      console.log('Script URL:', result.script_tag.src);
      console.log('🎉 Your popup script is now live on your Shopify store!');
    } else {
      const error = await response.json();
      console.error('❌ Failed to install script tag:', error);
    }

  } catch (error) {
    console.error('❌ Error installing script tag:', error);
  } finally {
    await prisma.$disconnect();
  }
}

installScriptTag();