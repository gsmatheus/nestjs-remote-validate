# NestJS Remote Validate

A powerful decorator for **NestJS** that enables validating DTO properties **against external HTTP APIs** — with dynamic URL injection, flexible validation logic, and automatic DTO enrichment.

This library brings to NestJS something that surprisingly _does not exist natively_:
a clean, declarative pattern for **remote validation**.

---

<p align="center">
  <img src="https://img.shields.io/npm/v/nestjs-remote-validate" />
  <img src="https://img.shields.io/npm/dm/nestjs-remote-validate" />
  <img src="https://img.shields.io/github/stars/gsmatheus/nestjs-remote-validate" />
  <img src="https://img.shields.io/badge/NestJS-v8%2B-red" />
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" />
</p>

---

## 🌟 Highlights

- **Remote Validation** — validate any field by querying an external API.
- **Dynamic Routes** — inject the field value into the URL (`/users/:id`).
- **POST & GET Support** — send body or use URL parameters.
- **Custom Validation Rules** — full control over success logic.
- **DTO Enrichment** — extract values from the API and inject into other fields.
- **Native NestJS Style** — works like `class-validator`, but with HTTP.

---

## 🧠 Why does this library exist?

NestJS excels in local validation using decorators (`@IsEmail()`, `@IsUUID()`, etc.).
But when developers need to validate data using **external APIs**, they usually:

- put validation inside controllers
- write custom pipes manually
- mix validation with business logic
- duplicate code between modules
- break the DTO → pipe pattern completely

There was no simple way to do:

```ts
@RemoteValidate({ host: 'https://my-api.com/users/:userId', method: 'GET' })
userId: string;
```

Now there is. 🎉

---

## 📦 Installation

```bash
npm install nestjs-remote-validate
```

---

## ⚙️ Setup

### 1. Register validator provider

```ts
import { Module } from "@nestjs/common";
import { RemoteApiValidatorConstraint } from "nestjs-remote-validate";

@Module({
  providers: [RemoteApiValidatorConstraint],
})
export class AppModule {}
```

### 2. Enable dependency injection in class-validator

```ts
import { useContainer } from "class-validator";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  await app.listen(3000);
}
bootstrap();
```

---

## 🔧 Decorator Options

- `host` (string, required) – target URL; supports `:${propertyName}` for dynamic injection.
- `method` (string, optional) – defaults to `POST`; in `GET/HEAD` no body is sent.
- `headers` (Record<string,string>, optional) – additional headers.
- `required` (boolean, optional) – if `true`, fails locally when empty; if `false`, skips validation when empty.
- `validate` (fn, optional) – receives `{ status, body }` and returns `boolean`.
- `extractValue` (fn, optional) – extracts value from `body` to enrich the DTO.
- `targetField` (string, optional) – DTO field that receives the value from `extractValue`.
- `timeout` (number, optional) – timeout in ms (default `5000`).

Notes:

- For `POST` requests, the body sent is `{"[property]": value}`.
- URL injection occurs only for placeholders that exactly match the property name, e.g., `id` → `:id`.

---

## 📚 Basic Usage

### ✔️ 1. POST validation with body

```ts
import { RemoteValidate } from "nestjs-remote-validate";

export class CreateDto {
  @RemoteValidate({
    host: "https://api.example.com/validate",
    method: "POST",
    required: true,
    validate: ({ status, body }) => status === 200 && body.valid === true,
  })
  field: string;
}
```

---

### ✔️ 2. GET validation with dynamic URL params

```ts
export class UpdateDto {
  @RemoteValidate({
    host: "https://api.example.com/resources/:id",
    method: "GET",
    validate: ({ status }) => status === 200,
  })
  id: string;
}
```

---

### ✔️ 3. Validate + enrich DTO (auto-populate another field)

```ts
export class EnrichedDto {
  @RemoteValidate({
    host: "https://api.example.com/products/:id",
    method: "GET",
    validate: ({ status }) => status === 200,
    extractValue: (body) => body?.name,
    targetField: "productName",
  })
  id: number;

  @Allow()
  productName: string;
}
```

---

## 🔥 Advanced Usage

### ✔️ Passing headers, tokens, or API keys

```ts
@RemoteValidate({
  host: "https://api.example.com/check",
  method: "POST",
  headers: {
    Authorization: "Bearer abc123",
  },
  validate: ({ status }) => status === 204,
})
value: string;
```

---

### ✔️ Inject multiple fields from response

```ts
@RemoteValidate({
  host: "https://api.example.com/users/:id",
  method: "GET",
  validate: ({ status }) => status === 200,
  extractValue: (body) => ({
    name: body.name,
    email: body.email,
  }),
  targetField: "user",
})
userId: number;

@Allow()
user: { name: string; email: string };
```

---

### ❗ Current Limitations

- `POST` request body is sent as `{"[property]": value}` without customization.
- HTTP client: uses `fetch` internally; custom client injection is not supported.

---

## 🔎 Comparison (Before vs After)

### ❌ Before (common NestJS approach)

```ts
// Controller
const result = await this.http.get(`/users/${dto.userId}`);
if (!result.valid) throw new BadRequestException();
```

Validation is mixed with business logic.

---

### ✅ After (clean DTO validation)

```ts
@RemoteValidate({ host: "https://api/users/:userId", method: "GET" })
userId: string;
```

Much cleaner. Works with pipes. Decoupled.

---

## 🤝 When should you use this?

Use this library when:

- you need to validate input against **external systems**
- you integrate with microservices
- you validate IDs that must exist upstream
- you follow DDD and want DTOs lean + descriptive
- you want consistent validation logic across modules

---

## ❓ FAQ

### • Does it run before the controller?

Yes — inside the `ValidationPipe`.

### • Does it support async validation?

100% asynchronous.

### • Does it support caching?

There is no customizable HTTP client; implement caching externally (API gateway, app-level cache, etc.).

### • Can it enrich multiple fields?

Yes — just return an object in `extractValue`.

### • Does it support headers or tokens?

Yes, fully.

### • Does it break on whitelist?

No — as long as you mark enriched fields with `@Allow()`.

---

## 🤝 Contributing

- Open issues and PRs on the official repository.
- To develop locally:
  - `npm install`
  - `npm test`
  - `npm run build`
- Standards: TypeScript; Jest for tests.

---

## 📝 License

MIT
