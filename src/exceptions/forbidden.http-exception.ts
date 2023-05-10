import HttpException from "./http-exception";
import configuration from "../configuration";

class ForbiddenHttpException extends HttpException {
    constructor() {
        super(403, "FORBIDDEN");
    }

    report() {
        if (configuration.environment !== "testing") {
            console.log("Forbidden");
        }
    }
}

export default ForbiddenHttpException;