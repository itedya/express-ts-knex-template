import HttpException from "./http-exception";
import * as util from "util";

class InternalServerErrorHttpException extends HttpException {
    private readonly err: any

    constructor(err: any) {
        super(500, "INTERNAL_SERVER_ERROR");
        this.err = err;
    }

    report() {
        console.log("Internal server error: " + util.inspect(this.err));
    }
}

export default InternalServerErrorHttpException;