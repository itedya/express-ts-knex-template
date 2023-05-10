import HttpException from "./http-exception";
import {ValidationError} from "class-validator";
import configuration from "../configuration";

class ValidationHttpException extends HttpException {
    constructor(data: ValidationError[]) {
        super(400, "VALIDATION_EXCEPTION", data.map(error => {
            delete error.target;
            return error;
        }));
    }

    report() {
        if (configuration.environment !== "testing") {
            console.log("Validation exception");
        }
    }
}

export default ValidationHttpException;