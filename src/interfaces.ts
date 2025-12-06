export interface ApiValidatorOptions {
  /**
   * The target URL for the validation request.
   * Supports dynamic parameters using `:paramName` syntax (e.g., 'https://api.com/users/:userId').
   */
  host: string;

  /**
   * HTTP Method (default: 'POST').
   */
  method?: string;

  /**
   * HTTP Headers to include in the request.
   */
  headers?: Record<string, string>;

  /**
   * Whether the field is required.
   * If true and value is empty, validation fails locally.
   * If false and value is empty, validation is skipped (success).
   */
  required?: boolean;

  /**
   * Custom validation logic based on the API response.
   * Receives the HTTP status and the parsed JSON body.
   * Should return true for valid, false for invalid.
   */
  validate?: (context: { status: number; body: any }) => boolean;

  /**
   * Function to extract a specific value from the API response body.
   * Used for side-effects (injecting data into the DTO).
   */
  extractValue?: (body: any) => any;

  /**
   * The name of the property in the DTO where the extracted value should be injected.
   */
  targetField?: string;

  /**
   * Request timeout in milliseconds (default: 5000ms).
   */
  timeout?: number;

  [key: string]: any;
}
