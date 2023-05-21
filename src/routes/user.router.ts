import express from "express";
import {wrapMiddlewares} from "../middlewares/error-handling.middleware";
import authTokenMiddleware from "../middlewares/auth-token.middleware";
import userController from "../controllers/user.controller";

const userRouter = express.Router();

userRouter.get("/user", ...wrapMiddlewares(authTokenMiddleware(true), userController.getPaginated));
userRouter.post("/user", ...wrapMiddlewares(authTokenMiddleware(true), userController.create));
userRouter.put("/user", ...wrapMiddlewares(authTokenMiddleware(true), userController.update));
userRouter.delete("/user", ...wrapMiddlewares(authTokenMiddleware(true), userController.delete));

export default userRouter;