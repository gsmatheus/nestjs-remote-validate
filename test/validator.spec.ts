import { ValidationArguments } from 'class-validator';
import { RemoteApiValidatorConstraint } from '../src/validator.constraint';
import { ExternalValidatorOptions } from '../src/interfaces';

// Mock global fetch
global.fetch = jest.fn();

describe('RemoteApiValidatorConstraint', () => {
  let constraint: RemoteApiValidatorConstraint;

  beforeEach(() => {
    constraint = new RemoteApiValidatorConstraint();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should return true if value is empty and required is false', async () => {
    const args: Partial<ValidationArguments> = {
      constraints: [{ required: false } as ExternalValidatorOptions],
    };
    const result = await constraint.validate(null, args as ValidationArguments);
    expect(result).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return false if value is empty and required is true', async () => {
    const args: Partial<ValidationArguments> = {
      constraints: [{ required: true } as ExternalValidatorOptions],
    };
    const result = await constraint.validate('', args as ValidationArguments);
    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should validate successfully via POST (default)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: 'cpf',
      constraints: [
        {
          host: 'https://api.com/validate',
          required: true,
        } as ExternalValidatorOptions,
      ],
    };

    const result = await constraint.validate(
      '123456',
      args as ValidationArguments,
    );

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.com/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ cpf: '123456' }),
      }),
    );
  });

  it('should validate successfully via GET with URL params', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: 'todoId',
      constraints: [
        {
          host: 'https://api.com/todos/:todoId',
          method: 'GET',
          required: true,
        } as ExternalValidatorOptions,
      ],
    };

    const result = await constraint.validate('1', args as ValidationArguments);

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.com/todos/1',
      expect.objectContaining({
        method: 'GET',
        body: undefined,
      }),
    );
  });

  it('should fail if external API returns 400/500', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid' }),
      status: 400,
    });

    const args: Partial<ValidationArguments> = {
      constraints: [
        { host: 'https://api.com', required: true } as ExternalValidatorOptions,
      ],
    };

    const result = await constraint.validate(
      'val',
      args as ValidationArguments,
    );
    expect(result).toBe(false);
  });

  it('should use custom validation logic', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, message: 'Blocked' }), // Status 200 but logical failure
      status: 200,
    });

    const args: Partial<ValidationArguments> = {
      property: 'email',
      constraints: [
        {
          host: 'https://api.com',
          validate: ({ body }) => body.valid === true,
        } as ExternalValidatorOptions,
      ],
    };

    const result = await constraint.validate(
      'test@test.com',
      args as ValidationArguments,
    );
    expect(result).toBe(false);
  });

  it('should extract value and inject into target object', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'My Todo' }),
      status: 200,
    });

    const targetObject: any = {};
    const args: Partial<ValidationArguments> = {
      object: targetObject,
      constraints: [
        {
          host: 'https://api.com',
          extractValue: (body) => body.title,
          targetField: 'todoTitle',
        } as ExternalValidatorOptions,
      ],
    };

    await constraint.validate('123', args as ValidationArguments);

    expect(targetObject.todoTitle).toBe('My Todo');
  });
});
