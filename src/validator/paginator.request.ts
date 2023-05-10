import {IsNumber, IsOptional, Min} from "class-validator";
import {Type} from "class-transformer";

class PaginatorRequest {
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    currentPage: number = 1;

    @IsOptional()
    @IsNumber()
    @Min(5)
    @Type(() => Number)
    perPage: number = 5;
}

export default PaginatorRequest;