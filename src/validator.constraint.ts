import { Injectable } from "@nestjs/common";
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { ExternalValidatorOptions } from "./interfaces";

@ValidatorConstraint({ async: true })
@Injectable()
export class RemoteApiValidatorConstraint
  implements ValidatorConstraintInterface
{
  async validate(value: any, args: ValidationArguments) {
    const [config] = args.constraints as [ExternalValidatorOptions];

    if (!value) {
      return !config.required;
    }

    try {
      let url = config.host;
      if (url.includes(`:${args.property}`)) {
        url = url.replace(`:${args.property}`, encodeURIComponent(value));
      }

      const method = (config.method || "POST").toUpperCase();
      const isBodyAllowed = !["GET", "HEAD"].includes(method);

      const controller = new AbortController();
      const timeout = config.timeout ?? 5000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: method,
        headers: config.headers,
        body: isBodyAllowed
          ? JSON.stringify({ [args.property]: value })
          : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data = null;
      try {
        data = await response.json();
      } catch {}

      if (config.extractValue && data) {
        const extracted = config.extractValue(data);
        const targetField = config.targetField;

        if (extracted !== undefined && targetField) {
          (args.object as any)[targetField] = extracted;
        }
      }

      if (config.validate) {
        return config.validate({ status: response.status, body: data });
      }

      return response.ok;
    } catch (error) {
      console.error("External validation error:", error);
      return false;
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
