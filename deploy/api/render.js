const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.run = (options) => {
  const apiDir = path.join(__dirname, '..', '..', 'apps', 'api');

  console.log(`[API -> Render] Starting packaging for API...`);

  console.log(`[API -> Render] Ready for Native Node deployment.`);

  if (options.packageOnly) {
    console.log(`[API -> Render] Package-only requested. Skipping deployment.`);
    return;
  }

  console.log(`[API -> Render] Triggering deployment to Render...`);
  console.log(`[API -> Render] Note: Render typically builds automatically when you push to GitHub.`);

  const deployHookUrl = process.env.RENDER_API_DEPLOY_HOOK_URL || process.env.RENDER_DEPLOY_HOOK_URL;

  if (deployHookUrl) {
    try {
      // Attempt to trigger a redeploy via Render deploy hook URL
      console.log(`[API -> Render] Calling deploy hook...`);
      execSync(`curl -X POST ${deployHookUrl}`, { stdio: 'inherit' });
      console.log(`\n[API -> Render] Deployment triggered successfully.`);
    } catch (error) {
      console.error(`\n⚠️  Failed to trigger Render deployment via Deploy Hook.`);
      throw new Error(`Deploy hook request failed.`);
    }
  } else {
    console.log(`\n⚠️  RENDER_API_DEPLOY_HOOK_URL or RENDER_DEPLOY_HOOK_URL is not set.`);
    console.log(`If you have set up auto-deploy on GitHub push in the Render dashboard, you can safely ignore this.`);
    console.log(`To trigger manual deployments from this script, find your Deploy Hook URL in the Render dashboard under your service settings, and set the RENDER_API_DEPLOY_HOOK_URL environment variable.`);
  }
};
