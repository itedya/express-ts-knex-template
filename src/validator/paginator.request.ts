import {IsNumber, IsOptional, Min} from "class-validator";
import {Type} from "class-transformer";
import DefaultValue from "./rules/default-value.rule";

class PaginatorRequest {
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    currentPage: number;

    @IsOptional()
    @IsNumber()
    @Min(5)
    @Type(() => Number)
    perPage: number;
}

export default PaginatorRequest;