import axios from "axios";

const FACEBOOK_API_URL = "https://graph.facebook.com/version/account_id/insights"; // add your API URL here👈🏻
const QUERY_PARAMS = {
    level: "ad",
    fields: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,ctr,cpc", // add your fields here here👈🏻
    date_preset: "yesterday", // add your date range here👈🏻
    breakdowns: "publisher_platform,platform_position",  // 👈🏻 Added breakdowns here
    access_token: "YOUR_ACCESS_TOKEN"

    // add your Access token here👆🏻
};
const tableName = "`account.dataset.table.`";

// add your BQ table here👆🏻

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
    return result.data.map(campaign => ({
        meta_campaign_id: campaign?.campaign_id || "unknown_campaign_id",
        meta_campaign_name: campaign?.campaign_name || "unknown_campaign_name",
        meta_adset_id: campaign?.adset_id || "unknown_adset_id",
        meta_adset_name: campaign?.adset_name || "unknown_adset_name",
        meta_ad_id: campaign?.ad_id || "unknown_ad_id",
        meta_ad_name: campaign?.ad_name || "unknown_ad_name",
        meta_impressions: campaign?.impressions ? parseInt(campaign.impressions) : 0,
        meta_clicks: campaign?.clicks ? parseInt(campaign.clicks) : 0,
        meta_spent: campaign?.spend ? parseFloat(campaign.spend) : 0.0,
        meta_ctr: campaign?.ctr ? parseFloat(campaign.ctr) : 0.0,
        meta_cpc: campaign?.cpc ? parseFloat(campaign.cpc) : 0.0,
        meta_publisher_platform: campaign?.publisher_platform || "unknown",  // ✅ Ensure breakdown fields are mapped
        meta_platform_position: campaign?.platform_position || "unknown",  // ✅ Ensure breakdown fields are mapped
        meta_start_date: campaign?.date_start ? new Date(campaign.date_start).toISOString() : null,
        meta_end_date: campaign?.date_stop ? new Date(campaign.date_stop).toISOString() : null
    }));
}

function generateBigQueryInsertQuery(inputRows) {
    const keys = [
        { name: "meta_campaign_id", type: "string" },
        { name: "meta_campaign_name", type: "string" },
        { name: "meta_adset_id", type: "string" },
        { name: "meta_adset_name", type: "string" },
        { name: "meta_ad_id", type: "string" },
        { name: "meta_ad_name", type: "string" },
        { name: "meta_impressions", type: "integer" },
        { name: "meta_clicks", type: "integer" },
        { name: "meta_spent", type: "float" },
        { name: "meta_ctr", type: "float" },
        { name: "meta_cpc", type: "float" },
        { name: "meta_publisher_platform", type: "string" },  // ✅ Added breakdowns
        { name: "meta_platform_position", type: "string" },  // ✅ Added breakdowns
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

        console.log("Raw API Response:", insights);

        console.log("Formatting Facebook Ads Insights...");
        const formattedData = formatCampaignData({ data: insights });

        console.log("Formatted Data:", formattedData);

        console.log("Generating BQ Query...");
        const bigQueryInsertQuery = generateBigQueryInsertQuery(formattedData);
        console.log("BigQuery Insert Query:", bigQueryInsertQuery);

        console.log("Sending Data to Webhook...");
        const webhookUrl = "https://webhook.site/sampleurl";

        ///used Boltic here ///
        const payload = { formattedData, bigQueryInsertQuery };

        await axios.post(webhookUrl, payload, { headers: { "Content-Type": "application/json" } });

        console.log("Data successfully sent to BigQuery.");
    } catch (error) {
        console.error("Error:", error);
    }
}

export { handler };