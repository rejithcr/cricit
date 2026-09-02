const { execSync } = require('child_process');
const path = require('path');

exports.run = (options) => {
  const clientDir = path.join(__dirname, '..', '..', 'apps', 'client');

  console.log(`[Mobile -> EAS] Starting packaging/build for Mobile App via Expo Application Services (EAS)...`);

  if (options.packageOnly) {
    console.log(`[Mobile -> EAS] Note: EAS build implies building in the cloud. Running eas build...`);
  }

  try {
    // We default to building both platforms if 'all' or 'mobile' is selected. 
    // In a real scenario you might want to specify --platform=all, ios, or android.
    execSync('npx eas build --platform all --non-interactive', { stdio: 'inherit', cwd: clientDir });
    console.log(`[Mobile -> EAS] Build triggered successfully on EAS.`);
  } catch (error) {
    throw new Error(`Failed to run EAS build. Have you installed eas-cli globally and logged in? (npm install -g eas-cli && eas login)`);
  }
};
