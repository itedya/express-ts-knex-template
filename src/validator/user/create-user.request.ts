import {IsBoolean, IsEmail, IsOptional, IsString, Length} from "class-validator";

class CreateUserRequest {
    @IsString()
    @Length(3, 64)
    username: string;

    @IsString()
    @Length(3, 64)
    password: string;

    @IsString()
    @IsEmail()
    @Length(8, 320)
    email: string;

    @IsOptional()
    @IsBoolean()
    isAdmin: boolean = true;
}

export default CreateUserRequest;