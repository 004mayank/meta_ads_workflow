import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { handler } from './handler.js';

const PORT = process.env.BOLT_APPLICATION_PORT || 8080;
const DEV_MODE = process.env.BOLT_DEVELOPMENT_MODE === 'true';

const app = express();

// Security middleware
app.use(helmet());

// Body parsers
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.text());

// Only use raw body parser for a specific route if needed
app.use('/webhook', bodyParser.raw({ type: '*/*' }));

// Catch malformed JSON error
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON:', err);
        return res.status(400).send({ error: 'Invalid JSON payload' });
    }
    next();
});

// Main request handler
const requestHandler = async (req, res) => {
    try {
        await handler(req, res);
        if (!res.headersSent) {
            res.status(200).json({ message: "handler completed without sending a response" });
        }
    } catch (error) {
        console.error("Error occurred while handling request:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Catch-all route
app.all('*', requestHandler);

// Start server
app.listen(PORT, () => {
    if (DEV_MODE) {
        console.log(`Listening for events on port ${PORT} in development mode`);
    } else {
        console.log(`Listening for events`);
    }
});
