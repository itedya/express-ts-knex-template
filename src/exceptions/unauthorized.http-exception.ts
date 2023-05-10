import HttpException from "./http-exception";
import configuration from "../configuration";

class UnauthorizedHttpException extends HttpException {
    constructor() {
        super(401, "UNAUTHORIZED");
    }

    report() {
        if (configuration.environment !== "testing") {
            console.log("Unauthorized");
        }
    }
}

export default UnauthorizedHttpException;