import HttpException from "./http-exception";
import configuration from "../configuration";

enum BadRequestCodes {
    USER_NOT_FOUND = "BAD_00001",
    USER_USERNAME_ALREADY_TAKEN = "BAD_00002",
    USER_EMAIL_ALREADY_TAKEN = "BAD_00003",

    MODEL_DOES_NOT_EXIST = "BAD_00004"
}

class BadRequestHttpException extends HttpException {
    constructor(...data: BadRequestCodes[]) {
        super(400, "BAD_REQUEST", data);
    }

    report() {
        if (configuration.environment !== "testing") {
            console.log("Bad request");
        }
    }
}

export {
    BadRequestHttpException as default,
    BadRequestCodes
}