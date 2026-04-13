declare global {
  namespace App {
    interface Locals {
      user: any | null;
      authHeader: string;
      localization: any;
    }
    interface PageData {
      user?: any;
    }
  }
}
export {};
