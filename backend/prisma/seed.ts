import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function createPlatformsAndData(userId: string, userName: string) {
  // --- Platforms ---
  console.log(`📱 Creating platforms for ${userName}...`);
  const facebookPlatform = await prisma.platform.upsert({
    where: {
      userId_type_externalId: {
        userId,
        type: 'FACEBOOK',
        externalId: `act_fb_${userId.slice(0, 8)}`,
      },
    },
    update: { isConnected: true, lastSyncAt: new Date() },
    create: {
      userId,
      type: 'FACEBOOK',
      name: `${userName} Facebook Ads`,
      externalId: `act_fb_${userId.slice(0, 8)}`,
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
        userId,
        type: 'INSTAGRAM',
        externalId: `ig_${userId.slice(0, 8)}`,
      },
    },
    update: { isConnected: true, lastSyncAt: new Date() },
    create: {
      userId,
      type: 'INSTAGRAM',
      name: `${userName} Instagram Ads`,
      externalId: `ig_${userId.slice(0, 8)}`,
      accessToken: 'demo_encrypted_token_instagram',
      refreshToken: 'demo_refresh_token_instagram',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isConnected: true,
      lastSyncAt: new Date(),
    },
  });
  console.log(`  ✅ ${instagramPlatform.name}`);

  const googlePlatform = await prisma.platform.upsert({
    where: {
      userId_type_externalId: {
        userId,
        type: 'GOOGLE_ADS',
        externalId: `gads_${userId.slice(0, 8)}`,
      },
    },
    update: { isConnected: true, lastSyncAt: new Date() },
    create: {
      userId,
      type: 'GOOGLE_ADS',
      name: `${userName} Google Ads`,
      externalId: `gads_${userId.slice(0, 8)}`,
      accessToken: 'demo_encrypted_token_google',
      refreshToken: 'demo_refresh_token_google',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isConnected: true,
      lastSyncAt: new Date(),
    },
  });
  console.log(`  ✅ ${googlePlatform.name}`);

  const tiktokPlatform = await prisma.platform.upsert({
    where: {
      userId_type_externalId: {
        userId,
        type: 'TIKTOK',
        externalId: `tt_${userId.slice(0, 8)}`,
      },
    },
    update: { isConnected: true, lastSyncAt: new Date() },
    create: {
      userId,
      type: 'TIKTOK',
      name: `${userName} TikTok Ads`,
      externalId: `tt_${userId.slice(0, 8)}`,
      accessToken: 'demo_encrypted_token_tiktok',
      refreshToken: 'demo_refresh_token_tiktok',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isConnected: true,
      lastSyncAt: new Date(),
    },
  });
  console.log(`  ✅ ${tiktokPlatform.name}`);

  // --- Campaigns ---
  console.log(`🎯 Creating campaigns for ${userName}...`);

  const fbCampaigns = [
    { name: 'Summer Sale 2024 - Conversions', status: 'ACTIVE' as const, dailyBudget: 150.00, lifetimeBudget: 4500.00 },
    { name: 'Brand Awareness - Video Ads', status: 'ACTIVE' as const, dailyBudget: 100.00, lifetimeBudget: 3000.00 },
    { name: 'Retargeting - Cart Abandonment', status: 'ACTIVE' as const, dailyBudget: 75.00, lifetimeBudget: 2250.00 },
    { name: 'Q1 Product Launch', status: 'PAUSED' as const, dailyBudget: 200.00, lifetimeBudget: 6000.00 },
    { name: 'Holiday Special Offer', status: 'ACTIVE' as const, dailyBudget: 120.00, lifetimeBudget: 3600.00 },
  ];

  const igCampaigns = [
    { name: 'Instagram Stories - Products', status: 'ACTIVE' as const, dailyBudget: 80.00, lifetimeBudget: 2400.00 },
    { name: 'Influencer Collab Boost', status: 'ACTIVE' as const, dailyBudget: 60.00, lifetimeBudget: 1800.00 },
    { name: 'Reels Campaign - Viral', status: 'PAUSED' as const, dailyBudget: 90.00, lifetimeBudget: 2700.00 },
  ];

  const googleCampaigns = [
    { name: 'Search - Brand Keywords', status: 'ACTIVE' as const, dailyBudget: 200.00, lifetimeBudget: 6000.00 },
    { name: 'Display - Remarketing', status: 'ACTIVE' as const, dailyBudget: 80.00, lifetimeBudget: 2400.00 },
    { name: 'Shopping - Product Feed', status: 'ACTIVE' as const, dailyBudget: 150.00, lifetimeBudget: 4500.00 },
    { name: 'YouTube - Video Discovery', status: 'PAUSED' as const, dailyBudget: 100.00, lifetimeBudget: 3000.00 },
  ];

  const tiktokCampaigns = [
    { name: 'TikTok Spark Ads - Trending', status: 'ACTIVE' as const, dailyBudget: 120.00, lifetimeBudget: 3600.00 },
    { name: 'In-Feed Ads - Gen Z', status: 'ACTIVE' as const, dailyBudget: 90.00, lifetimeBudget: 2700.00 },
    { name: 'TopView - Product Launch', status: 'PAUSED' as const, dailyBudget: 250.00, lifetimeBudget: 7500.00 },
  ];

  const allCreated = [];

  // Create FB campaigns
  for (let i = 0; i < fbCampaigns.length; i++) {
    const c = fbCampaigns[i];
    const campaign = await prisma.campaign.upsert({
      where: {
        platformId_externalId: {
          platformId: facebookPlatform.id,
          externalId: `fb_camp_${i + 1}`,
        },
      },
      update: {},
      create: {
        platformId: facebookPlatform.id,
        externalId: `fb_camp_${i + 1}`,
        name: c.name,
        status: c.status,
        platformType: 'FACEBOOK',
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    allCreated.push(campaign);
    console.log(`  ✅ [FB] ${campaign.name}`);
  }

  // Create IG campaigns
  for (let i = 0; i < igCampaigns.length; i++) {
    const c = igCampaigns[i];
    const campaign = await prisma.campaign.upsert({
      where: {
        platformId_externalId: {
          platformId: instagramPlatform.id,
          externalId: `ig_camp_${i + 1}`,
        },
      },
      update: {},
      create: {
        platformId: instagramPlatform.id,
        externalId: `ig_camp_${i + 1}`,
        name: c.name,
        status: c.status,
        platformType: 'INSTAGRAM',
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    allCreated.push(campaign);
    console.log(`  ✅ [IG] ${campaign.name}`);
  }

  // Create Google campaigns
  for (let i = 0; i < googleCampaigns.length; i++) {
    const c = googleCampaigns[i];
    const campaign = await prisma.campaign.upsert({
      where: {
        platformId_externalId: {
          platformId: googlePlatform.id,
          externalId: `gads_camp_${i + 1}`,
        },
      },
      update: {},
      create: {
        platformId: googlePlatform.id,
        externalId: `gads_camp_${i + 1}`,
        name: c.name,
        status: c.status,
        platformType: 'GOOGLE_ADS',
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    allCreated.push(campaign);
    console.log(`  ✅ [Google] ${campaign.name}`);
  }

  // Create TikTok campaigns
  for (let i = 0; i < tiktokCampaigns.length; i++) {
    const c = tiktokCampaigns[i];
    const campaign = await prisma.campaign.upsert({
      where: {
        platformId_externalId: {
          platformId: tiktokPlatform.id,
          externalId: `tt_camp_${i + 1}`,
        },
      },
      update: {},
      create: {
        platformId: tiktokPlatform.id,
        externalId: `tt_camp_${i + 1}`,
        name: c.name,
        status: c.status,
        platformType: 'TIKTOK',
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    allCreated.push(campaign);
    console.log(`  ✅ [TikTok] ${campaign.name}`);
  }

  // --- Metrics ---
  console.log(`📊 Generating 30 days of metrics for ${userName}...`);
  let metricsCount = 0;

  for (const campaign of allCreated) {
    for (let day = 29; day >= 0; day--) {
      const date = startOfDay(subDays(new Date(), day));

      const isActive = campaign.status === 'ACTIVE';
      const dailyBudget = campaign.dailyBudget || 100;

      // Add some variance based on day of week (weekends slightly lower)
      const dayOfWeek = date.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.0;

      const spend = isActive ? dailyBudget * (0.85 + Math.random() * 0.15) * weekendFactor : 0;
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
        update: {
          impressions: BigInt(impressions),
          reach: BigInt(reach),
          clicks: BigInt(clicks),
          spend,
          conversions,
          revenue,
          ctr,
          cpc,
          cpm,
          roas,
          conversionRate,
        },
        create: {
          campaignId: campaign.id,
          date: date,
          impressions: BigInt(impressions),
          reach: BigInt(reach),
          clicks: BigInt(clicks),
          spend,
          conversions,
          revenue,
          ctr,
          cpc,
          cpm,
          roas,
          conversionRate,
        },
      });
      metricsCount++;
    }
  }
  console.log(`  ✅ Created ${metricsCount} metric records`);

  return {
    platforms: 4,
    campaigns: allCreated.length,
    metrics: metricsCount,
  };
}

async function main() {
  console.log('🌱 Starting seed...\n');

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
  console.log(`  ✅ Admin user: ${adminUser.email}\n`);

  // --- Create data for both users ---
  console.log('═══ Demo User Data ═══');
  const demoStats = await createPlatformsAndData(demoUser.id, 'Demo');

  console.log('\n═══ Admin User Data ═══');
  const adminStats = await createPlatformsAndData(adminUser.id, 'Lisboa');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   👤 Users: 2`);
  console.log(`   📱 Platforms: ${demoStats.platforms + adminStats.platforms} (${demoStats.platforms} per user)`);
  console.log(`   🎯 Campaigns: ${demoStats.campaigns + adminStats.campaigns} (${demoStats.campaigns} per user)`);
  console.log(`   📊 Metrics: ${demoStats.metrics + adminStats.metrics} records`);
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
