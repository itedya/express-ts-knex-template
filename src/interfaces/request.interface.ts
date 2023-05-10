import { Request as ExpressRequest } from "express";
import UserDto from "../dtos/user.dto";
interface Request extends ExpressRequest {
    user?: UserDto;
}

export default Request;