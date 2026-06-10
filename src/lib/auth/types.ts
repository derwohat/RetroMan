import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    mustChangePassword: boolean;
    mfaEnabled: boolean;
    mfaPending?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      mustChangePassword: boolean;
      mfaEnabled: boolean;
      mfaPending?: boolean;
    };
  }
  interface JWT {
    id: string;
    role: string;
    mustChangePassword: boolean;
    mfaEnabled: boolean;
    mfaPending?: boolean;
  }
}
