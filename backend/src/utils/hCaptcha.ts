import { verify } from "hcaptcha";

export const verifyHCaptcha = async (token: string): Promise<boolean> => {
  const secret = process.env.HCAPTCHA_SECRET_KEY;

  if (!secret) {
    console.error("hCaptcha secret key not configured");
    return false;
  }

  try {
    const data = await verify(secret, token);
    return data.success;
  } catch (error) {
    console.error("hCaptcha verification failed:", error);
    return false;
  }
};