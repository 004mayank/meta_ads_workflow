


import express from 'express';
import bodyParser from 'body-parser';
import { handler } from './handler.js';


const PORT = process.env.BOLT_APPLICATION_PORT || 8080;
const DEV_MODE = process.env.BOLT_DEVELOPMENT_MODE || false;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(bodyParser.text())
app.use(bodyParser.raw())

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

app.all('*', requestHandler);

app.listen(PORT, () => {
    if (DEV_MODE) {
        console.log(
            `Listening for events on port ${PORT} in development mode`
        );
    } else {
        console.log(
            `Listening for events`
        );
    }
});
