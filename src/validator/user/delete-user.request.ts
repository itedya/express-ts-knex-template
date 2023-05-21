import {IsNumber, Min} from "class-validator";

class DeleteUserRequest {
    @IsNumber()
    @Min(1)
    id: number;
}

export default DeleteUserRequest;