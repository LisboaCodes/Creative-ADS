# Facebook Integration Setup Guide

This guide will help you set up Facebook and Instagram Ads integration with the Multi Ads Platform.

## Prerequisites

- Facebook account with access to a Facebook Ad Account
- Facebook Business Manager account (recommended)
- Admin access to the Facebook Ad Account you want to connect

## Step 1: Create a Facebook App

### 1.1 Go to Facebook Developers

Visit [Facebook Developers](https://developers.facebook.com/) and log in.

### 1.2 Create New App

1. Click "My Apps" in the top right
2. Click "Create App"
3. Choose app type: **Business**
4. Fill in app details:
   - **App Name:** Multi Ads Platform (or your preferred name)
   - **Contact Email:** Your email address
5. Click "Create App"

## Step 2: Configure Facebook Login

### 2.1 Add Facebook Login Product

1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Choose "Web" as the platform

### 2.2 Configure OAuth Settings

1. Go to "Facebook Login" > "Settings" in the left sidebar
2. Under "Valid OAuth Redirect URIs", add:
   ```
   http://localhost:3000/api/platforms/facebook/callback
   ```
   For production, also add:
   ```
   https://your-domain.com/api/platforms/facebook/callback
   ```
3. Save changes

## Step 3: Request Advanced Access

### 3.1 Required Permissions

Go to "App Review" > "Permissions and Features" and request access to:

- `ads_management` - Required for managing ads
- `ads_read` - Required for reading ad data
- `business_management` - Required for accessing ad accounts
- `pages_read_engagement` - Required for page insights
- `pages_manage_ads` - Required for creating ads

### 3.2 Verification Process

1. Fill out the questionnaire for each permission
2. Provide screen recordings showing how your app uses each permission
3. Submit for review (can take 1-7 days)

**Development Mode:** You can test with your own ad accounts before approval.

## Step 4: Get App Credentials

### 4.1 Find Your App ID and Secret

1. Go to "Settings" > "Basic" in your app dashboard
2. Copy your:
   - **App ID**
   - **App Secret** (click "Show")

### 4.2 Add to Backend Configuration

Edit `backend/.env`:

```env
FACEBOOK_APP_ID=your-app-id-here
FACEBOOK_APP_SECRET=your-app-secret-here
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/platforms/facebook/callback
```

## Step 5: Configure Ad Account Access

### 5.1 Add Test Users (Development)

1. Go to "Roles" > "Test Users"
2. Add test users who need access during development

### 5.2 Production Access

For production, users will authorize your app to access their ad accounts through OAuth.

## Step 6: Test the Integration

### 6.1 Start Your Application

```bash
# Make sure backend is running
cd backend
npm run dev

# Make sure frontend is running
cd frontend
npm run dev
```

### 6.2 Connect Facebook Account

1. Open http://localhost:5173
2. Log in to your account
3. Go to "Platforms" page
4. Click "Connect" on Facebook card
5. You'll be redirected to Facebook
6. Authorize the app
7. Select the ad account to connect
8. You'll be redirected back to the app

### 6.3 Verify Connection

1. Check that the platform appears as "Connected"
2. Click "Sync Now" to fetch campaigns
3. Go to "Campaigns" page to see your Facebook campaigns

## Common Issues

### Issue: "URL Blocked: This redirect failed"

**Solution:** Make sure your redirect URI is exactly:
```
http://localhost:3000/api/platforms/facebook/callback
```
Check for:
- No trailing slash
- Correct protocol (http/https)
- Correct port number

### Issue: "App Not Set Up: This app is still in development mode"

**Solution:**
1. Go to "Settings" > "Basic"
2. Turn on "App Mode" to "Live" (only after review approval)
3. For testing, add your Facebook account as a test user

### Issue: "Insufficient Permissions"

**Solution:**
1. Check that you've requested all required permissions
2. If in development mode, ensure your account is added as a test user
3. For production, wait for permission review approval

### Issue: "No Ad Accounts Found"

**Solution:**
1. Ensure you have at least one Ad Account in your Business Manager
2. Check that your Facebook account has admin access to the Ad Account
3. Try reconnecting the platform

### Issue: "Token Expired"

**Solution:**
Facebook tokens expire after 60 days. The app should handle renewal automatically, but if not:
1. Disconnect the platform
2. Reconnect it
3. Authorize again

## Token Lifecycle

### Access Token Duration

- **Short-lived token:** 1 hour (obtained during OAuth)
- **Long-lived token:** 60 days (automatically exchanged)

### Automatic Renewal

The backend attempts to exchange short-lived tokens for long-lived tokens automatically. However, after 60 days, users must re-authorize.

## API Rate Limits

Facebook Marketing API has rate limits:

- **Rate limit:** 200 calls per hour per user
- **Batch limit:** 50 requests per batch

The platform handles these automatically with:
- Request throttling
- Batch operations where possible
- Automatic retry with exponential backoff

## Best Practices

1. **Test Thoroughly:** Use development mode and test users before going live
2. **Monitor Token Expiry:** Implement alerts for expiring tokens
3. **Handle Errors Gracefully:** Facebook API can be unreliable; implement proper error handling
4. **Stay Updated:** Facebook frequently updates their APIs and policies
5. **Respect Rate Limits:** Don't make unnecessary API calls

## Data Synced

The integration automatically syncs:

### Campaign Data
- Campaign name
- Status (Active/Paused)
- Daily budget
- Lifetime budget
- Start/end dates

### Metrics (Daily)
- Impressions
- Reach
- Clicks
- Spend
- Conversions
- CTR, CPC, CPM, ROAS (calculated)

### Sync Frequency

- **Automatic:** Every 15 minutes (configurable)
- **Manual:** Click "Sync Now" on Platforms page

## Security Considerations

### Token Storage

- Access tokens are **encrypted** before storage
- Encryption uses AES-256-GCM
- Never expose tokens in logs or client-side

### API Requests

- All requests include authentication
- Rate limiting prevents abuse
- Tokens are automatically refreshed

### User Privacy

- Only request necessary permissions
- Clearly explain data usage
- Provide easy disconnect option

## Advanced Configuration

### Custom Sync Interval

Edit `backend/.env`:

```env
# Default is 15m (minutes)
SYNC_CAMPAIGNS_INTERVAL=15m

# Can use: m (minutes), h (hours), d (days)
# Examples:
SYNC_CAMPAIGNS_INTERVAL=30m  # 30 minutes
SYNC_CAMPAIGNS_INTERVAL=1h   # 1 hour
SYNC_CAMPAIGNS_INTERVAL=2h   # 2 hours
```

### Custom Metrics

To sync additional metrics, modify:
```typescript
backend/src/modules/platforms/integrations/facebook.service.ts
```

Look for the `getMetrics` method and add desired fields to the API request.

## Troubleshooting Commands

### Check Database Connection

```bash
cd backend
npx prisma studio
```

### View Sync Logs

```bash
cd backend
tail -f logs/combined-*.log | grep "Facebook"
```

### Manual Sync

```bash
# Using curl
curl -X POST http://localhost:3000/api/platforms/{platform-id}/sync \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Support Resources

- [Facebook Marketing API Documentation](https://developers.facebook.com/docs/marketing-apis)
- [Facebook Business Help Center](https://www.facebook.com/business/help)
- [Facebook Marketing API Changelog](https://developers.facebook.com/docs/graph-api/changelog)

## Next Steps

After setting up Facebook integration:

1. **Test Campaign Management:**
   - Pause/activate campaigns
   - Edit budgets
   - View detailed metrics

2. **Set Up Additional Platforms:**
   - Google Ads
   - TikTok
   - LinkedIn (Phase 2+)

3. **Configure Alerts:**
   - Budget thresholds
   - Performance alerts
   - Status changes (Phase 2+)

4. **Generate Reports:**
   - Daily/weekly summaries
   - Performance reports
   - ROI analysis (Phase 2+)
