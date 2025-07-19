import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function installGodModeScript() {
  try {
    const session = await prisma.session.findFirst({
      where: { shop: 'testingstoresumeet.myshopify.com' }
    });

    if (!session) {
      console.error('❌ No session found');
      return;
    }

    console.log('🚀 Installing GOD MODE script tag...');

    // Delete any existing script tags first
    const existingResponse = await fetch(`https://${session.shop}/admin/api/2023-04/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': session.accessToken
      }
    });
    
    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      for (const tag of existing.script_tags) {
        if (tag.src.includes('papapop.vercel.app') || tag.src.includes('smartpop.vercel.app')) {
          console.log('🗑️ Deleting old script tag:', tag.id);
          await fetch(`https://${session.shop}/admin/api/2023-04/script_tags/${tag.id}.json`, {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': session.accessToken
            }
          });
        }
      }
    }

    // Install GOD MODE script
    const response = await fetch(`https://${session.shop}/admin/api/2023-04/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: 'https://papapop.vercel.app/godmode-popup.js',
          display_scope: 'online_store'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ GOD MODE script installed!');
      console.log('Script ID:', result.script_tag.id);
      console.log('🚀 Visit your store now: https://testingstoresumeet.myshopify.com');
    } else {
      const error = await response.json();
      console.error('❌ Failed:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

installGodModeScript();