import { NextRequest } from "next/server";
import { POST as handleWebhook } from "../webhook/route";

export async function POST(req: NextRequest) {
  return handleWebhook(req);
}

