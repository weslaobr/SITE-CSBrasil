const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:contato@tropacs.com.br";

export function getVapidPublicKey(): string {
  return publicKey;
}

export function isVapidConfigured(): boolean {
  return !!(publicKey && privateKey);
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; icon?: string; url?: string; tag?: string }
): Promise<boolean> {
  if (!isVapidConfigured()) return false;
  try {
    const webpush = await import("web-push");
    webpush.default.setVapidDetails(subject, publicKey, privateKey);
    await webpush.default.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 86400 }
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn("[WebPush] Subscription expired or gone:", err.statusCode);
      return false;
    }
    console.error("[WebPush] Send error:", err);
    return false;
  }
}
