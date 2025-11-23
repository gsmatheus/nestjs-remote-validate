# NestJS Remote Validate

A powerful NestJS decorator that allows you to validate DTO properties against external APIs. It supports dynamic parameter substitution, custom success logic, and response data injection (side-effects).

## Features

- **Remote Validation**: Validate fields by calling an external HTTP endpoint.
- **Dynamic URLs**: Automatically substitute URL parameters with the field value (e.g., `/:userId`).
- **Flexible Methods**: Support for POST (sending body) and GET (URL params).
- **Custom Validation Logic**: Define your own success criteria (status code, body content).
- **Data Injection**: Extract data from the external API response and inject it into another field in your DTO (populating fields automatically).

## Installation

```bash
npm install nestjs-remote-validate
```

## Setup

### 1. Register the Provider

Register the constraint in your `app.module.ts` so NestJS can inject dependencies if needed (and manage the instance).

```typescript
import { Module } from '@nestjs/common';
import { RemoteApiValidatorConstraint } from 'nestjs-remote-validate';

@Module({
  providers: [RemoteApiValidatorConstraint],
})
export class AppModule {}
```

### 2. Configure Global Pipes & Container

In your `main.ts`, ensure `useContainer` is set up to allow `class-validator` to use NestJS dependency injection.

```typescript
import { useContainer } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Important: Allow class-validator to use NestJS DI
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

## Use Cases

### Case 1: Simple Validation via POST Body

Validates a field by sending its value in the request body to an external API.

```typescript
import { RemoteValidate } from 'nestjs-remote-validate';

export class CreateUserDto {
  @RemoteValidate({
    host: 'https://api.validator.com/check-cpf',
    method: 'POST',
    headers: { 'x-api-key': '123' },
    required: true,
    // Custom validation logic
    validate: ({ status, body }) => status === 200 && body.valid === true,
  })
  cpf: string;
}
```

_Sends JSON: `{ "cpf": "value" }`_

---

### Case 2: RESTful Validation (URL Parameters)

Validates a field by substituting it into the URL. Ideal for checking resource existence via GET.

```typescript
import { RemoteValidate } from 'nestjs-remote-validate';

export class UpdateTodoDto {
  @RemoteValidate({
    // :todoId will be replaced by the value of the decorated property
    host: 'https://jsonplaceholder.typicode.com/todos/:todoId',
    method: 'GET',
    required: true,
    validate: ({ status }) => status === 200,
  })
  todoId: string;
}
```

_Request: `GET https://jsonplaceholder.typicode.com/todos/123`_

---

### Case 3: Validation with Data Injection (Side-Effect)

Validates the field AND populates another field in the DTO with data from the external response.

**Note:** You must use `@Allow()` on the target field to prevent `ValidationPipe` (whitelist) from stripping it out, as it's not present in the original request payload.

```typescript
import { Allow } from 'class-validator';
import { RemoteValidate } from 'nestjs-remote-validate';

export class EnrichedTodoDto {
  @RemoteValidate({
    host: 'https://jsonplaceholder.typicode.com/todos/:todoId',
    method: 'GET',
    required: true,
    validate: ({ status }) => status === 200,
    // Extract title from response and inject into 'todoTitle'
    extractValue: (body) => body?.title,
    targetField: 'todoTitle',
  })
  todoId: number;

  @Allow() // Required to allow the injected property to pass through the whitelist
  todoTitle: string;
}
```

## License

MIT
