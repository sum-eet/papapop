import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndInstall() {
  try {
    const session = await prisma.session.findFirst({
      where: { shop: 'testingstoresumeet.myshopify.com' }
    });

    if (!session) {
      console.log('❌ No session found. App needs to be installed first.');
      return;
    }

    console.log('✅ Session found:', session.shop);
    console.log('🔑 Access token exists:', !!session.accessToken);
    console.log('📋 Scope:', session.scope);
    
    if (!session.scope?.includes('write_script_tags')) {
      console.log('❌ Missing write_script_tags permission');
      console.log('🔄 Need to reinstall app with new permissions');
      return;
    }

    console.log('🚀 Installing GOD MODE script...');

    // Delete existing script tags
    const existingResponse = await fetch(`https://${session.shop}/admin/api/2023-04/script_tags.json`, {
      headers: { 'X-Shopify-Access-Token': session.accessToken }
    });
    
    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      for (const tag of existing.script_tags) {
        if (tag.src.includes('papapop') || tag.src.includes('smartpop')) {
          console.log('🗑️ Deleting old script:', tag.id);
          await fetch(`https://${session.shop}/admin/api/2023-04/script_tags/${tag.id}.json`, {
            method: 'DELETE',
            headers: { 'X-Shopify-Access-Token': session.accessToken }
          });
        }
      }
    }

    // Install new script
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
      console.log('🚀✅ GOD MODE SCRIPT INSTALLED!');
      console.log('Script ID:', result.script_tag.id);
      console.log('🎯 Visit your store: https://testingstoresumeet.myshopify.com');
      console.log('💥 Popup will show after 3 seconds!');
    } else {
      const error = await response.json();
      console.log('❌ Installation failed:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndInstall();