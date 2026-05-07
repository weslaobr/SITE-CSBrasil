import NextAuth from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ nextauth: string[] }> }) {
    const resolvedParams = await params;
    return NextAuth(req, { params: resolvedParams }, getAuthOptions(req));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ nextauth: string[] }> }) {
    const resolvedParams = await params;
    return NextAuth(req, { params: resolvedParams }, getAuthOptions(req));
}
