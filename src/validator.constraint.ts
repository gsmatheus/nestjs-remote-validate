import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ExternalValidatorOptions } from './interfaces';

@ValidatorConstraint({ async: true })
@Injectable()
export class RemoteApiValidatorConstraint
  implements ValidatorConstraintInterface
{
  async validate(value: any, args: ValidationArguments) {
    const [config] = args.constraints as [ExternalValidatorOptions];

    // Required check
    if (!value) {
      return !config.required;
    }

    try {
      // 1. Dynamic URL parameter substitution
      let url = config.host;
      if (url.includes(`:${args.property}`)) {
        url = url.replace(`:${args.property}`, encodeURIComponent(value));
      }

      // 2. Body Control (GET/HEAD should not have body)
      const method = (config.method || 'POST').toUpperCase();
      const isBodyAllowed = !['GET', 'HEAD'].includes(method);

      const response = await fetch(url, {
        method: method,
        headers: config.headers,
        body: isBodyAllowed
          ? JSON.stringify({ [args.property]: value })
          : undefined,
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        // Ignore parse error if body is not JSON
      }

      // 3. Data Injection Side-Effect
      if (config.extractValue && data) {
        const extracted = config.extractValue(data);
        const targetField = config.targetField;

        if (extracted !== undefined && targetField) {
          // Inject value into the DTO instance
          (args.object as any)[targetField] = extracted;
        }
      }

      // 4. Custom or Default Validation
      if (config.validate) {
        return config.validate({ status: response.status, body: data });
      }

      // Default: Check if status is 2xx
      return response.ok;
    } catch (error) {
      console.error('External validation error:', error);
      return false; // Fail safe
    }
  }

  defaultMessage(args: ValidationArguments) {
    const [config] = args.constraints as [ExternalValidatorOptions];
    if (!args.value && config.required) {
      return `${args.property} is required.`;
    }
    return `${args.property} is invalid according to external validation.`;
  }
}
