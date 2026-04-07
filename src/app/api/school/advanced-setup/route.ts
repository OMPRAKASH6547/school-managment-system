import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstZodIssueMessage } from "@/lib/field-validation";

const bodySchema = z.object({
  paymentGatewayEnabled: z.boolean(),
  paymentGatewayProvider: z.enum(["payu"]).default("payu"),
  payuMerchantKey: z.string().trim().optional(),
  payuMerchantSalt: z.string().trim().optional(),
  payuSuccessUrl: z.string().trim().url().optional(),
  payuFailureUrl: z.string().trim().url().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["school_admin", "admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = bodySchema.parse(await req.json());

    if (parsed.paymentGatewayEnabled) {
      if (!parsed.payuMerchantKey || !parsed.payuMerchantSalt || !parsed.payuSuccessUrl || !parsed.payuFailureUrl) {
        return NextResponse.json(
          {
            error:
              "To enable online payments, Merchant Key, Merchant Salt, Success URL and Failure URL are all required.",
          },
          { status: 400 }
        );
      }
    }

    const org = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        paymentGatewayEnabled: parsed.paymentGatewayEnabled,
        paymentGatewayProvider: parsed.paymentGatewayProvider,
        payuMerchantKey: parsed.payuMerchantKey || null,
        payuMerchantSalt: parsed.payuMerchantSalt || null,
        payuSuccessUrl: parsed.payuSuccessUrl || null,
        payuFailureUrl: parsed.payuFailureUrl || null,
      },
      select: {
        paymentGatewayEnabled: true,
        paymentGatewayProvider: true,
      },
    });

    return NextResponse.json({ ok: true, config: org });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save advanced setup" }, { status: 500 });
  }
}
