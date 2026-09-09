# Deployment Guidelines for Underdocks

When deploying changes to the Underdocks application, ALWAYS adhere to the following steps to prevent backend/frontend mismatches and missing environment variables.

## 1. Backend Deployment (AWS SAM)
The backend is an AWS Serverless Application Model (SAM) stack.
- **Before Deploying**: Always compile the TypeScript source files.
  - Run `npm run build` in the `backend/` directory.
- **Deploying**:
  - The stack name is `underdocks-v2-backend` in the `eu-central-1` region.
  - **CRITICAL**: The stack requires the Azure Form Recognizer API key to parse PDFs/Images. If you re-deploy the stack using `sam deploy`, you **MUST** pass the `AzureApiKey` parameter override so the Lambda functions retain access.
  - The API key can be found in `backend/env.json`.
  - Deployment Command: 
    ```bash
    sam deploy --stack-name underdocks-v2-backend --region eu-central-1 --resolve-s3 --capabilities CAPABILITY_IAM --parameter-overrides AzureApiKey=<KEY_FROM_ENV_JSON>
    ```

## 2. Frontend Deployment (Vercel)
The frontend is hosted on Vercel and connected to GitHub.
- **Triggering Deployments**: Push your committed changes to the `main` branch on GitHub. Vercel will automatically build and deploy the app.
- **Environment Variables**:
  - The Vercel frontend relies on the `VITE_API_URL` environment variable to connect to the AWS SAM API Gateway.
  - **CRITICAL**: If the AWS API Gateway URL changes (e.g., because the stack was recreated or renamed), updating `.env.production` in the repository is **NOT ENOUGH**.
  - The user has environment variables defined directly in their Vercel Project Dashboard. Those dashboard variables will override the repository's `.env.production` file.
  - You MUST explicitly instruct the user to update `VITE_API_URL` in their **Vercel Dashboard -> Settings -> Environment Variables**, and then trigger a Redeployment on Vercel.

## 3. Local Testing
- To test the backend locally, use:
  ```bash
  sam local start-api --port 3000 --docker-network backend_default --env-vars env.json
  ```
- Any modifications to TypeScript handlers must be re-compiled using `npm run build` before local invocation will pick them up.
