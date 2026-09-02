# Deployment Guide

This repository contains a modular deployment script located at `deploy.js`.

## Coordinator Script Usage

You can run the coordinator script from the root of the monorepo to package and deploy applications.

```bash
# Deploy all apps to their default destinations
node deploy.js

# Package only (no deployment) for API
node deploy.js --app=api --package-only
```

## Render Hosting

[Render](https://render.com) is another excellent alternative provider with a free tier. You can deploy to Render using the existing Dockerfiles.

1. **Create a Render Account**
   Sign up at Render.

2. **Deploy via GitHub (Recommended)**
   The easiest way to deploy is to connect your GitHub repository directly in the Render Dashboard.
   
   **For the API (Web Service):**
   - Create a new **Web Service**.
   - Connect your GitHub repository.
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - Add the env variables from `apps/api/.env`

   **For the Web Client (Static Site):**
   - Create a new **Static Site**.
   - Connect your GitHub repository.
   - **Root Directory**: `apps/client`
   - **Build Command**: `npm install && npx expo export --platform web`
   - **Publish Directory**: `dist`
   - Add the environment variables from `apps/client/.env` (e.g., `EXPO_PUBLIC_API_URL`)

3. **Deploy via CLI Hook (Optional)**
   If you want to trigger deployments locally using our deploy script, you'll need to use Render's Deploy Hooks:
   - Find your **Deploy Hook URL** in the Render dashboard under your service settings.
   - Set the environment variable `RENDER_API_DEPLOY_HOOK_URL` (or `RENDER_WEB_DEPLOY_HOOK_URL` for web).
   - Run the deploy script:
     ```bash
     # Windows (PowerShell)
     $env:RENDER_API_DEPLOY_HOOK_URL="https://api.render.com/deploy/srv-xxx?key=yyy"
     node deploy.js --app=api --destination=render
     
     # macOS/Linux
     RENDER_API_DEPLOY_HOOK_URL="https://api.render.com/deploy/srv-xxx?key=yyy" node deploy.js --app=api --destination=render
     ```

## Web (EAS Hosting) Setup

You can deploy the web version of the application directly to Expo Application Services (EAS) Hosting.

1. **Install and Login**
   Ensure you have the EAS CLI installed and are logged in:
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Initialize Web Hosting**
   Run the following inside the `apps/client` folder to set up EAS hosting for your project (only needed once):
   ```bash
   cd apps/client
   npx eas build:configure
   ```

3. **Configure Environment Variables**
   Because the web bundle is built locally before being uploaded, ensure your environment variables are set in the client app:
   - Create or update `apps/client/.env` with your production API URL and other necessary keys (e.g., `EXPO_PUBLIC_API_URL=https://your-api.onrender.com`).

4. **Deploy **
   Run the commands from apps/client folder:
   ```bash
   npx expo export --platform web
   eas deploy 
   ```   

## Mobile (EAS) Setup

Mobile deployments use Expo Application Services (EAS).

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure your project for EAS: `eas build:configure` (if you haven't already).

## Custom Providers

The deploy script looks inside the `deploy/<app>/<destination>.js` folders. 
You can add new providers by creating scripts in those directories and running the deploy command with your new destination name.
