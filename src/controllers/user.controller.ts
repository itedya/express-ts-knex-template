import ControllerMethod from "../interfaces/controller-method.interface";
import {instanceToPlain, plainToInstance} from "class-transformer";
import GetPaginatedUsersRequest from "../validator/user/get-paginated-users.request";
import {validate} from "class-validator";
import ValidationHttpException from "../exceptions/validation.http-exception";
import unitOfWork from "../repositories/unit-of-work";
import UserDto from "../dtos/user.dto";
import PaginatedData from "../interfaces/paginated-data.interface";
import ForbiddenHttpException from "../exceptions/forbidden.http-exception";
import CreateUserRequest from "../validator/user/create-user.request";
import InvalidValueException from "../exceptions/invalid-value.exception";
import BadRequestHttpException, {BadRequestCodes} from "../exceptions/bad-request.http-exception";
import UpdateUserRequest from "../validator/user/update-user.request";

const getPaginated: ControllerMethod = async (req, res, next) => {
    if (!req.user!.isAdmin) {
        throw new ForbiddenHttpException();
    }

    const body = plainToInstance(GetPaginatedUsersRequest, req.query);
    const errors = await validate(body);

    if (errors.length !== 0) {
        throw new ValidationHttpException(errors);
    }

    const result = await unitOfWork<PaginatedData<UserDto>>(async function () {
        return this.userRepository.paginated.get(body.currentPage, body.perPage, body.search);
    });

    res.status(200).json(instanceToPlain(result));
}

const create: ControllerMethod = async (req, res, next) => {
    if (!req.user!.isAdmin) {
        throw new ForbiddenHttpException();
    }

    const body = plainToInstance(CreateUserRequest, req.body);
    const errors = await validate(body);

    if (errors.length !== 0) {
        throw new ValidationHttpException(errors);
    }

    const result = await unitOfWork(async function () {
        const userId = await this.userRepository.create(body.username, body.email, body.password, body.isAdmin);
        return this.userRepository.findById(userId);
    })
        .catch(err => {
            if (err instanceof InvalidValueException) {
                if (err.getPropName() === "username") throw new BadRequestHttpException(BadRequestCodes.USER_USERNAME_ALREADY_TAKEN);
                else if (err.getPropName() === "email") throw new BadRequestHttpException(BadRequestCodes.USER_EMAIL_ALREADY_TAKEN);
            }

            throw err;
        });

    if (result === undefined) {
        throw new Error("Created user is undefined, something weird is happening.");
    }

    res.status(200).json(instanceToPlain(result))
}

const update: ControllerMethod = async (req, res, next) => {
    const body = plainToInstance(UpdateUserRequest, req.body);
    const errors = await validate(body);

    if (errors.length !== 0) {
        throw new ValidationHttpException(errors);
    }

    if (body.id !== req.user!.id && !req.user!.isAdmin) {
        throw new ForbiddenHttpException();
    }

    const result = await unitOfWork(async function () {
        const user = await this.userRepository.findById(body.id);
        if (user === undefined) throw new BadRequestHttpException(BadRequestCodes.MODEL_DOES_NOT_EXIST);
        if (user.isAdmin !== body.isAdmin && !req.user!.isAdmin) {
            throw new ForbiddenHttpException();
        }

        await this.userRepository.update(body.id, body.username, body.email, body.isAdmin);
        return this.userRepository.findById(body.id);
    })
        .catch(err => {
            if (err instanceof InvalidValueException) {
                if (err.getPropName() === "id") throw new BadRequestHttpException(BadRequestCodes.MODEL_DOES_NOT_EXIST);
                else if (err.getPropName() === "username") throw new BadRequestHttpException(BadRequestCodes.USER_USERNAME_ALREADY_TAKEN);
                else if (err.getPropName() === "email") throw new BadRequestHttpException(BadRequestCodes.USER_EMAIL_ALREADY_TAKEN);
            }

            throw err;
        });

    if (result === undefined) {
        throw new Error("Updated user is undefined, something weird is happening.");
    }

    res.status(200).json(instanceToPlain(result));
}

const userController = {
    getPaginated,
    create,
    update
}

export default userController;