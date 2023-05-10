import express from "express";
import authController from "../controllers/auth.controller";
import {wrapMiddlewares} from "../middlewares/error-handling.middleware";
import authTokenMiddleware from "../middlewares/auth-token.middleware";

const authRouter = express.Router();

authRouter.get("/auth/user", ...wrapMiddlewares(authTokenMiddleware(true), authController.user));
authRouter.post("/auth/login", ...wrapMiddlewares(authController.login));
authRouter.post("/auth/register", ...wrapMiddlewares(authController.register));

export default authRouter;