export class LegacyBbsError extends Error {
  code: number;
  status: number;

  constructor(message: string, status: number, code: number) {
    super(message);
    this.name = 'LegacyBbsError';
    this.status = status;
    this.code = code;
  }
}
