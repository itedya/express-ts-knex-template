import ControllerMethod from "../interfaces/controller-method.interface";
import UnauthorizedHttpException from "../exceptions/unauthorized.http-exception";
import encryptionService from "../services/encryption.service";
import configuration from "../configuration";
import unitOfWork from "../repositories/unit-of-work";
import UserDto from "../dtos/user.dto";

const authTokenMiddleware = (required: boolean = true): ControllerMethod => async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (header === undefined) throw new UnauthorizedHttpException();

        const splittedHeader = header.split(" ");
        if (splittedHeader.length !== 2) throw new UnauthorizedHttpException();
        if (splittedHeader[0] !== "Bearer") throw new UnauthorizedHttpException();

        const decoded = await encryptionService.decryptAES256(splittedHeader[1], configuration.encryption.key, configuration.encryption.iv);
        if (decoded === "") throw new UnauthorizedHttpException();

        const user = await unitOfWork<UserDto|undefined>(async function() {
            return this.userRepository.findByAuthenticationUuid(decoded);
        });

        if (user === undefined) throw new UnauthorizedHttpException();

        req.user = user;

        next();
    } catch (error) {
        if (error instanceof UnauthorizedHttpException && !required) return next();
        else throw error;
    }
}

export default authTokenMiddleware;