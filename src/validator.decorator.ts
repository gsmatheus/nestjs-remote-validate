import { registerDecorator, ValidationOptions } from "class-validator";
import { ApiValidatorConstraint } from "./validator.constraint";
import { ApiValidatorOptions } from "./interfaces";

export function ValidateApi(
  options: ApiValidatorOptions,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: ApiValidatorConstraint,
    });
  };
}
