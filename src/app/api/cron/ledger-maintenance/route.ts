import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { runScheduledLedgerMaintenance } from "@/modules/invoices/service";

function isAuthorizedCronRequest(request: NextRequest, expectedSecret: string): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${expectedSecret}`) {
    return true;
  }
  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === expectedSecret;
}

async function handleMaintenance(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Scheduled maintenance endpoint is disabled: CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  if (!isAuthorizedCronRequest(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized cron invocation." }, { status: 401 });
  }

  try {
    const result = await runScheduledLedgerMaintenance();

    for (const companyId of result.affectedCompanyIds) {
      const tags = [
        `invoices-${companyId}`,
        `kpis-${companyId}`,
        `aging-${companyId}`,
        `clients-${companyId}`,
        `treasury-${companyId}`,
        `calendar-${companyId}`,
        `dashboard-${companyId}`,
      ];
      for (const tag of tags) {
        try {
          updateTag(tag);
        } catch {
          try {
            revalidateTag(tag, { expire: 0 });
          } catch {
            // Outside Next request cache context
          }
        }
      }
    }

    if (result.updatedOverdueCount > 0) {
      try {
        revalidatePath("/invoices");
        revalidatePath("/dashboard");
        revalidatePath("/cash-flow");
        revalidatePath("/calendar");
      } catch {
        // Best-effort path revalidation
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Cron Ledger Maintenance Error]:", err);
    return NextResponse.json({ error: "Maintenance run failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleMaintenance(request);
}

export async function POST(request: NextRequest) {
  return handleMaintenance(request);
}
