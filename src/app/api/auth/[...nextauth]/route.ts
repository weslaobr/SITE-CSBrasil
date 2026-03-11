import NextAuth from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, ctx: any) {
    return NextAuth(req, ctx, getAuthOptions(req));
}

export async function POST(req: NextRequest, ctx: any) {
    return NextAuth(req, ctx, getAuthOptions(req));
}
