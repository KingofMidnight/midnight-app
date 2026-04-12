import fetch from "node-fetch";

export const verifyHCaptcha = async (token: string): Promise<boolean> => {
  const secret = process.env.HCAPTCHA_SECRET_KEY;

  if (!secret) {
    console.error("hCaptcha secret key not configured");
    return false;
  }

  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });

    const data = await response.json() as { success: boolean };

    return data.success;
  } catch (error) {
    console.error("hCaptcha verification failed:", error);
    return false;
  }
};