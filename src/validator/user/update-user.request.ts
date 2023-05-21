import {IsBoolean, IsEmail, IsNumber, IsOptional, IsString, Length, Min} from "class-validator";

class UpdateUserRequest {
    @IsNumber()
    @Min(1)
    id: number;

    @IsString()
    @Length(3, 64)
    username: string;

    @IsString()
    @IsEmail()
    @Length(3, 64)
    email: string;

    @IsOptional()
    @IsBoolean()
    isAdmin: boolean = false;
}

export default UpdateUserRequest;