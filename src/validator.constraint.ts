import { Injectable, Logger } from "@nestjs/common";
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { ApiValidatorOptions } from "./interfaces";

@ValidatorConstraint({ async: true })
@Injectable()
export class ApiValidatorConstraint implements ValidatorConstraintInterface {
  constructor(private readonly logger?: Logger) {
    if (!this.logger) {
      this.logger = new Logger(ApiValidatorConstraint.name);
    }
  }

  private logError(message: string, error: any) {
    if (this.logger) {
      this.logger.error(message, error?.stack || error);
    } else {
      console.error(message, error);
    }
  }

  async validate(value: any, args: ValidationArguments) {
    const [config] = args.constraints as [ApiValidatorOptions];

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

      let bodyData = null;
      if (isBodyAllowed) {
        if (config.mapBody) {
          bodyData = config.mapBody(value, args.object);
        } else {
          bodyData = { [args.property]: value };
        }
      }

      const controller = new AbortController();
      const timeout = config.timeout ?? 5000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: method,
        headers: config.headers,
        body: bodyData ? JSON.stringify(bodyData) : undefined,
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
      this.logError("External validation error:", error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const [config] = args.constraints as [ApiValidatorOptions];
    if (!args.value && config.required) {
      return `${args.property} is required.`;
    }
    return `${args.property} is invalid according to external validation.`;
  }
}
