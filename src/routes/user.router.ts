import express from "express";
import authController from "../controllers/auth.controller";
import {wrapMiddlewares} from "../middlewares/error-handling.middleware";
import authTokenMiddleware from "../middlewares/auth-token.middleware";
import userController from "../controllers/user.controller";

const userRouter = express.Router();

userRouter.get("/user", ...wrapMiddlewares(authTokenMiddleware(true), userController.getPaginated));
userRouter.post("/user", ...wrapMiddlewares(authTokenMiddleware(true), userController.create))
export default userRouter;