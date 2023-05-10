import {NextFunction, Response} from "express";
import Request from "./request.interface";

interface ControllerMethod {
    (req: Request, res: Response, next: NextFunction): Promise<any>;
}

export default ControllerMethod;