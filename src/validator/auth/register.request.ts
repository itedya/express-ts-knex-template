import {IsAlphanumeric, IsEmail, IsString, IsStrongPassword, Length} from "class-validator";

class LoginRequest {
    @IsString()
    @IsAlphanumeric()
    @Length(3, 64)
    username: string;

    @IsString()
    @IsEmail()
    @Length(0, 320)
    email: string;

    @IsString()
    @Length(8, 64)
    @IsStrongPassword({
        minLength: 8,
        minNumbers: 2,
        minSymbols: 1,
        minUppercase: 1,
        minLowercase: 1
    })
    password: string;
}

export default LoginRequest;