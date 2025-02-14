import axios from "axios";

const FACEBOOK_API_URL = "https://graph.facebook.com/v19.0/act_1566078160589611/insights";
const QUERY_PARAMS = {
    level: "ad",
    fields: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,ctr,cpc,conversions",
    breakdowns: "age,gender",
    date_preset: "yesterday",
    access_token: "EAAP0hyO4pgYBOZBCCnqLdFuZBsZBIXjsR7kDdbOgf9A2T3GeYs7nu1g7krpWuVs9ezlUqGdMJGlQZB1vJi11rmHtAm9AZCMBC7XNlZA2cQI7FZB6IpOZC3Bth7E0fK4GTpdZCwFZBxy3XWbHkgzZBZB8jZCYxkqpuLKOj6CV7cdvaE1lFZCZBbznTveQEY4lvqM"
};
const tableName = "`gofibo.meta.meta_ads_data`";


async function fetchInsights(url, params, accumulatedData = []) {
    try {
        const response = await axios.get(url, { params });
        const data = response.data;

        accumulatedData.push(...data.data);

        if (data.paging && data.paging.next) {
            return fetchInsights(data.paging.next, {}, accumulatedData);
        }

        return accumulatedData;
    } catch (error) {
        console.error("Error fetching insights:", error);
        throw error;
    }
}

function formatCampaignData(result) {
    const { data } = result;
    return data.map(campaign => ({
        meta_campaign_id: campaign?.campaign_id || "unknown_campaign_id",
        meta_campaign_name: campaign?.campaign_name || "unknown_campaign_name",
        meta_impressions: campaign?.impressions ? parseInt(campaign.impressions) : 0,
        meta_adset_id: campaign?.adset_id || "unknown_adset_id",
        meta_adset_name: campaign?.adset_name || "unknown_adset_name",
        meta_ad_id: campaign?.ad_id || "unknown_ad_id",
        meta_ad_name: campaign?.ad_name || "unknown_ad_name",
        meta_clicks: campaign?.clicks ? parseInt(campaign.clicks) : 0,
        meta_spent: campaign?.spend ? parseFloat(campaign.spend) : 0.0,
        meta_ctr: campaign?.ctr ? parseFloat(campaign.ctr) : 0.0,
        meta_cpc: campaign?.cpc ? parseFloat(campaign.cpc) : 0.0,
        meta_cpm: campaign?.cpm ? parseFloat(campaign.cpm) : 0.0,
        meta_age: campaign?.age || "unknown",  // Extract age from breakdown
        meta_gender: campaign?.gender || "unknown",  // Extract gender from breakdown
        meta_conversions: campaign?.conversions ? parseInt(campaign.conversions) : 0,
        meta_conversion_rate: campaign?.conversion_rate ? parseFloat(campaign.conversion_rate) : 0.0,
        meta_start_date: campaign?.date_start ? new Date(campaign.date_start).toISOString() : null,
        meta_end_date: campaign?.date_stop ? new Date(campaign.date_stop).toISOString() : null
    }));
}

function generateBigQueryInsertQuery(inputRows) {
    const keys = [
        { name: "meta_campaign_id", type: "string" },
        { name: "meta_adset_id", type: "string" },
        { name: "meta_adset_name", type: "string" },
        { name: "meta_ad_id", type: "string" },
        { name: "meta_ad_name", type: "string" },
        { name: "meta_campaign_name", type: "string" },
        { name: "meta_impressions", type: "integer" },
        { name: "meta_clicks", type: "integer" },
        { name: "meta_spent", type: "float" },
        { name: "meta_ctr", type: "float" },
        { name: "meta_cpc", type: "float" },
        { name: "meta_cpm", type: "float" },
        { name: "meta_age", type: "string" },
        { name: "meta_gender", type: "string" },
        { name: "meta_conversions", type: "integer" },
        { name: "meta_conversion_rate", type: "float" },
        { name: "meta_start_date", type: "timestamp" },
        { name: "meta_end_date", type: "timestamp" }
    ];

    let query = `INSERT INTO ${tableName} (` + keys.map(key => key.name).join(", ") + ") VALUES ";

    const valuesList = inputRows.map(inputRow => {
        const values = keys.map(key => {
            const value = inputRow[key.name];
            if (value === "" || value === undefined || value === null) {
                return "NULL";
            }
            if (typeof value === "object") {
                return `'${JSON.stringify(value).replace(/'/g, "\\'")}'`;
            }
            switch (key.type) {
                case "timestamp":
                    return `'${value}'`;
                case "string":
                    return `'${String(value).replace(/'/g, "\\'")}'`;
                case "float":
                case "integer":
                    return value;
                default:
                    return `'${value}'`;
            }
        });
        return `(${values.join(", ")})`;
    });

    return query + valuesList.join(", ") + ";";
}

async function handler(req, res) {
    res.status(200).json({ message: "Processing started" });
    try {
        console.log("Fetching Facebook Ads Insights...");
        const insights = await fetchInsights(FACEBOOK_API_URL, QUERY_PARAMS);

        console.log("Raw API Response:", insights); // Debugging

        console.log("Formatting Facebook Ads Insights...");
        const formattedData = formatCampaignData({ data: insights });

        console.log("Formatted Data:", formattedData); // Debugging

        console.log("Generating BQ Query...");
        const bigQueryInsertQuery = generateBigQueryInsertQuery(formattedData);
        console.log("BigQuery Insert Query:", bigQueryInsertQuery);

        console.log("Putting Data in BQ...");
        const webhookUrl = "https://asia-south1.api.boltic.io/service/webhook/temporal/v1.0/3c4a5387-c37e-4350-b364-f733b24933fa/workflows/execute/6031d8df-47be-4caf-9da1-3a20be7ec401/0.0.1/webhook";
        const payload = { formattedData, bigQueryInsertQuery };

        await axios.post(webhookUrl, payload, { headers: { "Content-Type": "application/json" } });

        console.log("Data successfully sent to BigQuery.");
    } catch (error) {
        console.error("Error:", error);
    }
}

export { handler };