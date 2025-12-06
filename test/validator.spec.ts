import { ValidationArguments } from "class-validator";
import { ApiValidatorConstraint } from "../src/validator.constraint";
import { ApiValidatorOptions } from "../src/interfaces";

global.fetch = jest.fn();

describe("ApiValidatorConstraint", () => {
  let constraint: ApiValidatorConstraint;

  beforeEach(() => {
    constraint = new ApiValidatorConstraint();
    (global.fetch as jest.Mock).mockClear();
  });

  it("should return true if value is empty and required is false", async () => {
    const args: Partial<ValidationArguments> = {
      constraints: [{ required: false } as ApiValidatorOptions],
    };
    const result = await constraint.validate(null, args as ValidationArguments);
    expect(result).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should return false if value is empty and required is true", async () => {
    const args: Partial<ValidationArguments> = {
      constraints: [{ required: true } as ApiValidatorOptions],
    };
    const result = await constraint.validate("", args as ValidationArguments);
    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should validate successfully via POST (default)", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: "cpf",
      constraints: [
        {
          host: "https://api.com/validate",
          required: true,
        } as ApiValidatorOptions,
      ],
    };

    const result = await constraint.validate(
      "123456",
      args as ValidationArguments
    );

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.com/validate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ cpf: "123456" }),
      })
    );
  });

  it("should validate successfully via GET with URL params", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: "todoId",
      constraints: [
        {
          host: "https://api.com/todos/:todoId",
          method: "GET",
          required: true,
        } as ApiValidatorOptions,
      ],
    };

    const result = await constraint.validate("1", args as ValidationArguments);

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.com/todos/1",
      expect.objectContaining({
        method: "GET",
        body: undefined,
      })
    );
  });

  it("should fail if external API returns 400/500", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Invalid" }),
      status: 400,
    });

    const args: Partial<ValidationArguments> = {
      constraints: [
        { host: "https://api.com", required: true } as ApiValidatorOptions,
      ],
    };

    const result = await constraint.validate(
      "val",
      args as ValidationArguments
    );
    expect(result).toBe(false);
  });

  it("should use custom validation logic", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, message: "Blocked" }),
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: "email",
      constraints: [
        {
          host: "https://api.com",
          validate: ({ body }) => body.valid === true,
        } as ApiValidatorOptions,
      ],
    };

    const result = await constraint.validate(
      "test@test.com",
      args as ValidationArguments
    );
    expect(result).toBe(false);
  });

  it("should extract value and inject into target object", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ title: "My Todo" }),
      status: 200,
    });

    const targetObject: any = {};
    const args: Partial<ValidationArguments> = {
      object: targetObject,
      constraints: [
        {
          host: "https://api.com",
          extractValue: (body) => body.title,
          targetField: "todoTitle",
        } as ApiValidatorOptions,
      ],
    };

    await constraint.validate("123", args as ValidationArguments);

    expect(targetObject.todoTitle).toBe("My Todo");
  });

  it("should use default timeout of 5000ms when timeout is not specified", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: "field",
      constraints: [
        {
          host: "https://api.com/validate",
          required: true,
        } as ApiValidatorOptions,
      ],
    };

    await constraint.validate("value", args as ValidationArguments);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.com/validate",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("should use custom timeout when specified", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: "field",
      constraints: [
        {
          host: "https://api.com/validate",
          required: true,
          timeout: 10000,
        } as ApiValidatorOptions,
      ],
    };

    await constraint.validate("value", args as ValidationArguments);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.com/validate",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("should fail validation when request times out", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error("This operation was aborted");
            error.name = "AbortError";
            reject(error);
          }, 200);
        })
    );

    const args: Partial<ValidationArguments> = {
      property: "field",
      constraints: [
        {
          host: "https://api.com/validate",
          required: true,
          timeout: 100,
        } as ApiValidatorOptions,
      ],
    };

    const result = await constraint.validate(
      "value",
      args as ValidationArguments
    );

    expect(result).toBe(false);
  });

  describe("mapBody feature", () => {
    it("should use default body format when mapBody is not provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
      });

      const args: Partial<ValidationArguments> = {
        property: "userId",
        constraints: [
          {
            host: "https://api.com/validate",
            method: "POST",
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate("123", args as ValidationArguments);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.com/validate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userId: "123" }),
        })
      );
    });

    it("should use mapBody to rename property", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
      });

      const args: Partial<ValidationArguments> = {
        property: "userCode",
        constraints: [
          {
            host: "https://api.com/check-user",
            method: "POST",
            mapBody: (code: string) => ({ id: code }),
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate("123", args as ValidationArguments);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.com/check-user",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id: "123" }),
        })
      );
    });

    it("should use mapBody to create nested structure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
      });

      const args: Partial<ValidationArguments> = {
        property: "email",
        constraints: [
          {
            host: "https://api.legacy.com/search",
            method: "POST",
            mapBody: (email: string) => ({
              query: {
                filter: {
                  contact_email: email,
                  active: true,
                },
              },
            }),
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate(
        "test@example.com",
        args as ValidationArguments
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.legacy.com/search",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            query: {
              filter: {
                contact_email: "test@example.com",
                active: true,
              },
            },
          }),
        })
      );
    });

    it("should use mapBody with access to other DTO fields", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true }),
        status: 200,
      });

      const dtoObject = {
        storeId: "store-456",
        couponCode: "DISCOUNT20",
      };

      const args: Partial<ValidationArguments> = {
        property: "couponCode",
        object: dtoObject,
        constraints: [
          {
            host: "https://api.loja.com/validate-coupon",
            method: "POST",
            mapBody: (coupon: string, dto: any) => ({
              code: coupon,
              store_id: dto.storeId,
            }),
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate("DISCOUNT20", args as ValidationArguments);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.loja.com/validate-coupon",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            code: "DISCOUNT20",
            store_id: "store-456",
          }),
        })
      );
    });

    it("should not use mapBody for GET requests", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1 }),
        status: 200,
      });

      const args: Partial<ValidationArguments> = {
        property: "userId",
        constraints: [
          {
            host: "https://api.com/users/:userId",
            method: "GET",
            mapBody: (value: string) => ({ transformed: value }),
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate("123", args as ValidationArguments);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.com/users/123",
        expect.objectContaining({
          method: "GET",
          body: undefined,
        })
      );
    });

    it("should not use mapBody for HEAD requests", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
        status: 200,
      });

      const args: Partial<ValidationArguments> = {
        property: "resourceId",
        constraints: [
          {
            host: "https://api.com/resources/:resourceId",
            method: "HEAD",
            mapBody: (value: string) => ({ transformed: value }),
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate("resource-123", args as ValidationArguments);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.com/resources/resource-123",
        expect.objectContaining({
          method: "HEAD",
          body: undefined,
        })
      );
    });

    it("should handle mapBody returning complex objects", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
      });

      const args: Partial<ValidationArguments> = {
        property: "productId",
        constraints: [
          {
            host: "https://api.com/validate-product",
            method: "POST",
            mapBody: (id: string) => ({
              product: {
                id,
                metadata: {
                  source: "validation",
                  timestamp: "2023-01-01",
                },
              },
              options: {
                checkStock: true,
                checkPrice: true,
              },
            }),
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate("prod-789", args as ValidationArguments);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.com/validate-product",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            product: {
              id: "prod-789",
              metadata: {
                source: "validation",
                timestamp: "2023-01-01",
              },
            },
            options: {
              checkStock: true,
              checkPrice: true,
            },
          }),
        })
      );
    });

    it("should work with mapBody for PUT method", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ updated: true }),
        status: 200,
      });

      const args: Partial<ValidationArguments> = {
        property: "status",
        constraints: [
          {
            host: "https://api.com/update-status",
            method: "PUT",
            mapBody: (status: string) => ({ newStatus: status }),
          } as ApiValidatorOptions,
        ],
      };

      await constraint.validate("active", args as ValidationArguments);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.com/update-status",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ newStatus: "active" }),
        })
      );
    });
  });
});
