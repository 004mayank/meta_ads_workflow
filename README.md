**Meta Ads Data Pipeline**


This repository contains a serverless workflow built with Boltic (Google Cloud) to fetch advertising insights from Meta's API and load them into BigQuery. Due to pagination constraints on Meta's API, this workflow handles recursive calls to ensure complete data retrieval.

**🛠 Tech Stack**


Node.js 20 (Boltic Runtime)


Express.js


Axios for API requests


BigQuery (Destination)


Google Cloud Run (Serverless) via Boltic

**📁 Workflow Overview**


This solution is split into two primary serverless workflows:

(Workflow Name	and Purpose are mentioned below)


meta_ads_data_scheduler	- Triggers data fetch from Meta API

meta_ads_data_into_bq	- Pushes formatted data into BigQuery

**🚀 Step-by-Step Workflow**

1. Scheduler Trigger
Runs on a predefined schedule.
Sends an HTTP request to invoke the handler endpoint.
Starts the fetch and load process.

2. Fetch Meta Ads Data
URL: https://graph.facebook.com/version/account_id/insights
Fetches ad-level insights: campaign_id, ad_id, impressions, clicks, spend, ctr, cpc, etc.
Includes breakdowns: publisher_platform, platform_position
Handles pagination using the paging.next field recursively.

3. Transform & Format
Converts raw JSON into a structured array:
Adds missing/null defaults.
Ensures proper types (e.g., int, float, timestamp).
Example fields: meta_ad_id, meta_campaign_name, meta_clicks, meta_ctr, etc.

4. Generate BigQuery Insert Query
Builds a dynamic INSERT INTO query for your BQ table.
Supports batching of rows using a single multi-row SQL query.

5. Send to Webhook
Data and SQL query are sent to a webhook (Boltic internally connects this to BQ).
Endpoint: https://webhook.site/... (for demo/testing).

**🔧 Configuration**

boltic.yaml
app: "meta-ads-data-pipeline"
region: "asia-south1"
handler: "handler.handler"
language: "nodejs/20"
build:
  builtin: dockerfile
  ignorefile: .gitignore
  
Meta API Fields can be modified in handler.js under QUERY_PARAMS.

**📂 File Structure**

├── autogen_index.js        # Express server entrypoint


├── handler.js              # Core logic: Fetch, transform, push


├── boltic.yaml             # Boltic deployment config


├── Dockerfile              # Custom container (optional)


├── package.json            # Node.js dependencies


├── .gitignore, .dockerignore

**🔁 Pagination Handling**

Pagination is handled recursively with the following logic:

if (data.paging && data.paging.next) {
  return fetchInsights(data.paging.next, {}, accumulatedData);
}
This ensures all paginated insights are pulled until the end.


**✅ To Do**
 Add error handling for invalid tokens or API rate limits.
 Include retry logic for webhook/BQ ingestion.
Parameterize dataset/table name.

**👤 Author**
Mayank Malviya. – mayankmalviya21@gmail.com

**📦 Installation (for local testing)**
git clone https://github.com/your-org/meta-ads-data-pipeline.git
cd meta-ads-data-pipeline
npm install
npm run dev
