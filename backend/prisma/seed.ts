import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // --- Users ---
  console.log('👤 Creating users...');
  const hashedDemo = await bcrypt.hash('Demo123!', 12);
  const adminPassword = process.env.ADMIN_PASSWORD || 'Lisboa2026!';
  const hashedAdmin = await bcrypt.hash(adminPassword, 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@multiads.com' },
    update: {},
    create: {
      email: 'demo@multiads.com',
      password: hashedDemo,
      name: 'Demo User',
      role: 'ADMIN',
    },
  });
  console.log(`  ✅ Demo user: ${demoUser.email}`);

  const adminUser = await prisma.user.upsert({
    where: { email: 'lisboa.codes@gmail.com' },
    update: {},
    create: {
      email: 'lisboa.codes@gmail.com',
      password: hashedAdmin,
      name: 'Lisboa Admin',
      role: 'ADMIN',
    },
  });
  console.log(`  ✅ Admin user: ${adminUser.email}`);

  // --- Platforms ---
  console.log('📱 Creating platforms...');
  const facebookPlatform = await prisma.platform.upsert({
    where: {
      userId_type_externalId: {
        userId: demoUser.id,
        type: 'FACEBOOK',
        externalId: 'act_123456789',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      type: 'FACEBOOK',
      name: 'Demo Facebook Ads Account',
      externalId: 'act_123456789',
      accessToken: 'demo_encrypted_token_facebook',
      refreshToken: 'demo_refresh_token_facebook',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isConnected: true,
      lastSyncAt: new Date(),
    },
  });
  console.log(`  ✅ ${facebookPlatform.name}`);

  const instagramPlatform = await prisma.platform.upsert({
    where: {
      userId_type_externalId: {
        userId: demoUser.id,
        type: 'INSTAGRAM',
        externalId: 'ig_987654321',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      type: 'INSTAGRAM',
      name: 'Demo Instagram Account',
      externalId: 'ig_987654321',
      accessToken: 'demo_encrypted_token_instagram',
      refreshToken: 'demo_refresh_token_instagram',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isConnected: true,
      lastSyncAt: new Date(),
    },
  });
  console.log(`  ✅ ${instagramPlatform.name}`);

  // --- Campaigns ---
  console.log('🎯 Creating Facebook campaigns...');
  const fbCampaigns = [
    { name: 'Summer Sale 2024 - Conversion Campaign', status: 'ACTIVE' as const, dailyBudget: 150.00, lifetimeBudget: 4500.00 },
    { name: 'Brand Awareness - Video Ads', status: 'ACTIVE' as const, dailyBudget: 100.00, lifetimeBudget: 3000.00 },
    { name: 'Retargeting - Cart Abandonment', status: 'ACTIVE' as const, dailyBudget: 75.00, lifetimeBudget: 2250.00 },
    { name: 'Q1 Product Launch', status: 'PAUSED' as const, dailyBudget: 200.00, lifetimeBudget: 6000.00 },
    { name: 'Holiday Special Offer', status: 'ACTIVE' as const, dailyBudget: 120.00, lifetimeBudget: 3600.00 },
  ];

  const createdFbCampaigns = [];
  for (let i = 0; i < fbCampaigns.length; i++) {
    const c = fbCampaigns[i];
    const campaign = await prisma.campaign.upsert({
      where: {
        platformId_externalId: {
          platformId: facebookPlatform.id,
          externalId: `fb_campaign_${i + 1}`,
        },
      },
      update: {},
      create: {
        platformId: facebookPlatform.id,
        externalId: `fb_campaign_${i + 1}`,
        name: c.name,
        status: c.status,
        platformType: 'FACEBOOK',
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    createdFbCampaigns.push(campaign);
    console.log(`  ✅ ${campaign.name}`);
  }

  console.log('📸 Creating Instagram campaigns...');
  const igCampaigns = [
    { name: 'Instagram Stories - Product Showcase', status: 'ACTIVE' as const, dailyBudget: 80.00, lifetimeBudget: 2400.00 },
    { name: 'Influencer Collaboration Boost', status: 'ACTIVE' as const, dailyBudget: 60.00, lifetimeBudget: 1800.00 },
    { name: 'Reels Campaign - Viral Content', status: 'PAUSED' as const, dailyBudget: 90.00, lifetimeBudget: 2700.00 },
  ];

  const createdIgCampaigns = [];
  for (let i = 0; i < igCampaigns.length; i++) {
    const c = igCampaigns[i];
    const campaign = await prisma.campaign.upsert({
      where: {
        platformId_externalId: {
          platformId: instagramPlatform.id,
          externalId: `ig_campaign_${i + 1}`,
        },
      },
      update: {},
      create: {
        platformId: instagramPlatform.id,
        externalId: `ig_campaign_${i + 1}`,
        name: c.name,
        status: c.status,
        platformType: 'INSTAGRAM',
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    createdIgCampaigns.push(campaign);
    console.log(`  ✅ ${campaign.name}`);
  }

  // --- Metrics ---
  console.log('📊 Generating metrics for last 30 days...');
  const allCampaigns = [...createdFbCampaigns, ...createdIgCampaigns];

  for (const campaign of allCampaigns) {
    console.log(`  📈 Generating metrics for: ${campaign.name}`);

    for (let day = 29; day >= 0; day--) {
      const date = startOfDay(subDays(new Date(), day));

      const isActive = campaign.status === 'ACTIVE';
      const dailyBudget = campaign.dailyBudget || 100;

      const spend = isActive ? dailyBudget * (0.85 + Math.random() * 0.15) : 0;
      const impressions = isActive ? Math.floor(spend * (800 + Math.random() * 400)) : 0;
      const reach = isActive ? Math.floor(impressions * (0.6 + Math.random() * 0.2)) : 0;
      const clicks = isActive ? Math.floor(impressions * (0.01 + Math.random() * 0.02)) : 0;
      const conversions = isActive ? Math.floor(clicks * (0.02 + Math.random() * 0.08)) : 0;
      const revenue = conversions * (30 + Math.random() * 70);

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      await prisma.metric.upsert({
        where: {
          campaignId_date: {
            campaignId: campaign.id,
            date: date,
          },
        },
        update: {},
        create: {
          campaignId: campaign.id,
          date: date,
          impressions: BigInt(impressions),
          reach: BigInt(reach),
          clicks: BigInt(clicks),
          spend: spend,
          conversions: conversions,
          revenue: revenue,
          ctr: ctr,
          cpc: cpc,
          cpm: cpm,
          roas: roas,
          conversionRate: conversionRate,
        },
      });
    }
    console.log(`    ✅ Created 30 days of metrics`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   👤 Users: 2`);
  console.log(`   📱 Platforms: 2 (Facebook, Instagram)`);
  console.log(`   🎯 Campaigns: ${allCampaigns.length} (${createdFbCampaigns.length} Facebook, ${createdIgCampaigns.length} Instagram)`);
  console.log(`   📊 Metrics: ${allCampaigns.length * 30} records (30 days per campaign)`);
  console.log('\n🔐 Demo Login:');
  console.log(`   Email: demo@multiads.com`);
  console.log(`   Password: Demo123!`);
  console.log('\n🔐 Admin Login:');
  console.log(`   Email: lisboa.codes@gmail.com`);
  console.log(`   Password: ${adminPassword === 'Lisboa2026!' ? 'Lisboa2026!' : '(from ADMIN_PASSWORD env)'}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
