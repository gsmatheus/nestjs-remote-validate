import { registerDecorator, ValidationOptions } from 'class-validator';
import { RemoteApiValidatorConstraint } from './validator.constraint';
import { ExternalValidatorOptions } from './interfaces';

export function RemoteValidate(
  options: ExternalValidatorOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: RemoteApiValidatorConstraint,
    });
  };
}
