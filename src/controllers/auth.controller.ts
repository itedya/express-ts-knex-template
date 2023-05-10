import ControllerMethod from "../interfaces/controller-method.interface";
import {validate} from "class-validator";
import {instanceToPlain, plainToInstance} from "class-transformer";
import LoginRequest from "../validator/auth/login.request";
import RegisterRequest from "../validator/auth/register.request";
import ValidationHttpException from "../exceptions/validation.http-exception";
import unitOfWork from "../repositories/unit-of-work";
import UserDto from "../dtos/user.dto";
import encryptionService from "../services/encryption.service";
import BadRequestHttpException, {BadRequestCodes} from "../exceptions/bad-request.http-exception";
import InternalServerErrorHttpException from "../exceptions/internal-server-error.http-exception";
import configuration from "../configuration";
import InvalidValueException from "../exceptions/invalid-value.exception";

const login: ControllerMethod = async (req, res, next) => {
    const request = plainToInstance(LoginRequest, req.body);
    const errors = await validate(request);

    if (errors.length !== 0) {
        throw new ValidationHttpException(errors);
    }

    const user = await unitOfWork<UserDto|undefined>(async function() {
        const result = await this.userRepository.findByUsername(request.login);
        if (result !== undefined) return result;
        return this.userRepository.findByEmail(request.login);
    });

    if (user === undefined) {
        throw new BadRequestHttpException(BadRequestCodes.USER_NOT_FOUND);
    }

    const passwordCheck = await encryptionService.checkBCrypt(user.password, request.password);
    if (!passwordCheck) {
        throw new BadRequestHttpException(BadRequestCodes.USER_NOT_FOUND);
    }

    const token = await encryptionService.encryptAES256(
        user.authenticationUuid,
        configuration.encryption.key,
        configuration.encryption.iv
    );

    return res.json({
        user: instanceToPlain(user),
        token
    });
}

const register: ControllerMethod = async (req, res, next) => {
    const request = plainToInstance(RegisterRequest, req.body);
    const errors = await validate(request);

    if (errors.length !== 0) {
        throw new ValidationHttpException(errors);
    }

    const user = await unitOfWork(async function() {
        const id = await this.userRepository.create(request.username, request.email, request.password);
        return this.userRepository.findById(id);
    })
        .catch(err => {
            if (!(err instanceof InvalidValueException)) throw err;
            if (err.getPropName() === "username") {
                throw new BadRequestHttpException(BadRequestCodes.USER_USERNAME_ALREADY_TAKEN);
            } else if (err.getPropName() === "email") {
                throw new BadRequestHttpException(BadRequestCodes.USER_EMAIL_ALREADY_TAKEN);
            } else throw err;
        });

    if (user === undefined) {
        throw new InternalServerErrorHttpException(new Error("Created user is undefined, something weird is happening..."));
    }

    return res.json(instanceToPlain(user));
}

const user: ControllerMethod = async (req, res, next) => {
    return res.json(instanceToPlain(req.user!));
}

const authController = {login, register, user}

export default authController;