import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.metric.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  console.log('👤 Creating demo user...');
  const hashedPassword = await bcrypt.hash('Demo123!', 12);

  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@multiads.com',
      password: hashedPassword,
      name: 'Demo User',
      role: 'ADMIN',
    },
  });

  console.log(`✅ Created user: ${demoUser.email}`);

  // Create Facebook platform
  console.log('📱 Creating Facebook platform...');
  const facebookPlatform = await prisma.platform.create({
    data: {
      userId: demoUser.id,
      type: 'FACEBOOK',
      name: 'Demo Facebook Ads Account',
      externalId: 'act_123456789',
      accessToken: 'demo_encrypted_token_facebook',
      refreshToken: 'demo_refresh_token_facebook',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      isConnected: true,
      lastSyncAt: new Date(),
    },
  });

  console.log(`✅ Created platform: ${facebookPlatform.name}`);

  // Create Instagram platform
  console.log('📸 Creating Instagram platform...');
  const instagramPlatform = await prisma.platform.create({
    data: {
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

  console.log(`✅ Created platform: ${instagramPlatform.name}`);

  // Create campaigns for Facebook
  console.log('🎯 Creating Facebook campaigns...');
  const fbCampaigns = [
    {
      name: 'Summer Sale 2024 - Conversion Campaign',
      status: 'ACTIVE',
      dailyBudget: 150.00,
      lifetimeBudget: 4500.00,
    },
    {
      name: 'Brand Awareness - Video Ads',
      status: 'ACTIVE',
      dailyBudget: 100.00,
      lifetimeBudget: 3000.00,
    },
    {
      name: 'Retargeting - Cart Abandonment',
      status: 'ACTIVE',
      dailyBudget: 75.00,
      lifetimeBudget: 2250.00,
    },
    {
      name: 'Q1 Product Launch',
      status: 'PAUSED',
      dailyBudget: 200.00,
      lifetimeBudget: 6000.00,
    },
    {
      name: 'Holiday Special Offer',
      status: 'ACTIVE',
      dailyBudget: 120.00,
      lifetimeBudget: 3600.00,
    },
  ];

  const createdFbCampaigns = [];
  for (let i = 0; i < fbCampaigns.length; i++) {
    const campaignData = fbCampaigns[i];
    const campaign = await prisma.campaign.create({
      data: {
        platformId: facebookPlatform.id,
        externalId: `fb_campaign_${i + 1}`,
        name: campaignData.name,
        status: campaignData.status as any,
        platformType: 'FACEBOOK',
        dailyBudget: campaignData.dailyBudget,
        lifetimeBudget: campaignData.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    createdFbCampaigns.push(campaign);
    console.log(`  ✅ ${campaign.name}`);
  }

  // Create campaigns for Instagram
  console.log('📸 Creating Instagram campaigns...');
  const igCampaigns = [
    {
      name: 'Instagram Stories - Product Showcase',
      status: 'ACTIVE',
      dailyBudget: 80.00,
      lifetimeBudget: 2400.00,
    },
    {
      name: 'Influencer Collaboration Boost',
      status: 'ACTIVE',
      dailyBudget: 60.00,
      lifetimeBudget: 1800.00,
    },
    {
      name: 'Reels Campaign - Viral Content',
      status: 'PAUSED',
      dailyBudget: 90.00,
      lifetimeBudget: 2700.00,
    },
  ];

  const createdIgCampaigns = [];
  for (let i = 0; i < igCampaigns.length; i++) {
    const campaignData = igCampaigns[i];
    const campaign = await prisma.campaign.create({
      data: {
        platformId: instagramPlatform.id,
        externalId: `ig_campaign_${i + 1}`,
        name: campaignData.name,
        status: campaignData.status as any,
        platformType: 'INSTAGRAM',
        dailyBudget: campaignData.dailyBudget,
        lifetimeBudget: campaignData.lifetimeBudget,
        startDate: subDays(new Date(), 30),
      },
    });
    createdIgCampaigns.push(campaign);
    console.log(`  ✅ ${campaign.name}`);
  }

  // Generate metrics for the last 30 days
  console.log('📊 Generating metrics for last 30 days...');
  const allCampaigns = [...createdFbCampaigns, ...createdIgCampaigns];

  for (const campaign of allCampaigns) {
    console.log(`  📈 Generating metrics for: ${campaign.name}`);

    for (let day = 29; day >= 0; day--) {
      const date = startOfDay(subDays(new Date(), day));

      // Generate realistic metrics
      const isActive = campaign.status === 'ACTIVE';
      const dailyBudget = campaign.dailyBudget || 100;

      // Realistic ranges
      const spend = isActive ? dailyBudget * (0.85 + Math.random() * 0.15) : 0;
      const impressions = isActive ? Math.floor(spend * (800 + Math.random() * 400)) : 0;
      const reach = isActive ? Math.floor(impressions * (0.6 + Math.random() * 0.2)) : 0;
      const clicks = isActive ? Math.floor(impressions * (0.01 + Math.random() * 0.02)) : 0;
      const conversions = isActive ? Math.floor(clicks * (0.02 + Math.random() * 0.08)) : 0;
      const revenue = conversions * (30 + Math.random() * 70);

      // Calculated metrics
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      await prisma.metric.create({
        data: {
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
  console.log(`   👤 Users: 1`);
  console.log(`   📱 Platforms: 2 (Facebook, Instagram)`);
  console.log(`   🎯 Campaigns: ${allCampaigns.length} (${createdFbCampaigns.length} Facebook, ${createdIgCampaigns.length} Instagram)`);
  console.log(`   📊 Metrics: ${allCampaigns.length * 30} records (30 days per campaign)`);
  console.log('\n🔐 Demo Login:');
  console.log(`   Email: demo@multiads.com`);
  console.log(`   Password: Demo123!`);
  console.log('\n🌐 Access:');
  console.log(`   Frontend: http://localhost:5174`);
  console.log(`   Backend API: http://localhost:3000`);
  console.log(`   Swagger Docs: http://localhost:3000/api-docs`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
