import "next-auth";

declare module "next-auth" {
  interface User {
    username: string;
    role: string;
    mustChangePassword: boolean;
    mfaEnabled: boolean;
    mfaPending?: boolean;
  }
  interface Session {
    user: {
      id: string;
      username: string;
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
    username: string;
    role: string;
    mustChangePassword: boolean;
    mfaEnabled: boolean;
    mfaPending?: boolean;
  }
}
