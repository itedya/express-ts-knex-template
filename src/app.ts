import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import migrate from "./database/migrations";
import authRouter from "./routes/auth.router";
import userRouter from "./routes/user.router";

const createApp = async () => {
    const app = express();

    await migrate();

    app.use(cors());
    app.use(bodyParser.json());

    app.use(authRouter);
    app.use(userRouter);

    return app;
}

export default createApp;