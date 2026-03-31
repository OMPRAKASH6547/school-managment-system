import crypto from "node:crypto";

/**
 * PayU India — payment hash (SHA-512).
 * @see https://docs.payu.in/docs/preparing-the-payment-request
 */
export function payuPaymentHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  salt: string;
}): string {
  const { key, txnid, amount, productinfo, firstname, email, salt } = params;
  const udf1 = "";
  const udf2 = "";
  const udf3 = "";
  const udf4 = "";
  const udf5 = "";
  const text = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  return crypto.createHash("sha512").update(text).digest("hex");
}

/** Verify PayU response hash (reverse formula). */
export function payuVerifyResponseHash(params: {
  salt: string;
  status: string;
  udf5?: string;
  udf4?: string;
  udf3?: string;
  udf2?: string;
  udf1?: string;
  email: string;
  firstname: string;
  productinfo: string;
  amount: string;
  txnid: string;
  key: string;
}): string {
  const { salt, status, udf5 = "", udf4 = "", udf3 = "", udf2 = "", udf1 = "", email, firstname, productinfo, amount, txnid, key } =
    params;
  const text = `${salt}|${status}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  return crypto.createHash("sha512").update(text).digest("hex");
}

export function payuBaseUrl(): string {
  const mode = process.env.PAYU_MODE ?? "test";
  return mode === "production" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";
}
