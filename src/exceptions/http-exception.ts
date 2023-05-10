import {Request, Response} from "express";

class HttpException extends Error {
    private statusCode: number;
    private data?: object;

    constructor(statusCode: number, message: string, data?: object) {
        super();
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }

    render(req: Request, res: Response) {
        res.status(this.statusCode)
            .json({
                message: this.message,
                statusCode: this.statusCode,
                data: this.data
            });
    }

    report() {
        console.log(this.message, this.data);
    }
}

export default HttpException;