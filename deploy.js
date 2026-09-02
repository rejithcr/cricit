#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

// Parse arguments
const options = {
  app: 'all', // all | api | web | mobile
  destination: 'default', // default | render | eas
  packageOnly: false,
};

args.forEach((arg) => {
  if (arg.startsWith('--app=')) options.app = arg.split('=')[1];
  else if (arg.startsWith('--destination=')) options.destination = arg.split('=')[1];
  else if (arg === '--package-only') options.packageOnly = true;
});

const runDeployer = (appName, dest) => {
  console.log(`\n========================================`);
  console.log(`🚀 Processing deployment for [${appName.toUpperCase()}] to [${dest.toUpperCase()}]`);
  console.log(`========================================\n`);

  const deployerScriptPath = path.join(__dirname, 'deploy', appName, `${dest}.js`);
  
  if (!fs.existsSync(deployerScriptPath)) {
    console.error(`❌ No deployer found for app '${appName}' with destination '${dest}'`);
    console.error(`Expected script at: ${deployerScriptPath}`);
    return false;
  }

  try {
    const deployer = require(deployerScriptPath);
    deployer.run(options);
    return true;
  } catch (err) {
    console.error(`❌ Deployment failed for ${appName}:`, err.message);
    return false;
  }
};

const execute = () => {
  const appsToDeploy = options.app === 'all' ? ['api', 'web', 'mobile'] : [options.app];
  let hasError = false;

  appsToDeploy.forEach((app) => {
    let dest = options.destination;
    
    // Set default destinations if 'default' is selected
    if (dest === 'default') {
      if (app === 'api') dest = 'render';
      if (app === 'web') dest = 'eas';
      if (app === 'mobile') dest = 'eas';
    }

    const success = runDeployer(app, dest);
    if (!success) hasError = true;
  });

  if (hasError) {
    console.error('\n⚠️  Deployment finished with errors.');
    process.exit(1);
  } else {
    console.log('\n✅ Deployment finished successfully!');
  }
};

execute();
