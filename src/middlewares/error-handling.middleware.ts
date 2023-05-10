import ControllerMethod from "../interfaces/controller-method.interface";
import HttpException from "../exceptions/http-exception";
import InternalServerErrorHttpException from "../exceptions/internal-server-error.http-exception";

const errorHandlingMiddleware = (controllerMethod: ControllerMethod): ControllerMethod => async (req, res, next) => {
    return controllerMethod(req, res, next)
        .catch(err => {
            if (!(err instanceof HttpException)) {
                err = new InternalServerErrorHttpException(err);
            }

            err.report()

            err.render(req, res);
        });
}

const wrapMiddlewares = (...middlewares: ControllerMethod[]) => {
    return middlewares.map(middleware => errorHandlingMiddleware(middleware));
}

export {
    errorHandlingMiddleware as default,
    wrapMiddlewares
};