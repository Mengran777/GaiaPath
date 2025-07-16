// src/app/api/trips/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trips = await prisma.trip.findMany({
    where: { userId: auth.userId },
    select: { id: true, name: true, startDate: true, endDate: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(trips);
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, startDate, endDate } = await request.json();
  if (!name || !startDate || !endDate)
    return NextResponse.json(
      { error: "Missing required fields: name, startDate, endDate" },
      { status: 400 }
    );

  const trip = await prisma.trip.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userId: auth.userId,
    },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  return NextResponse.json(trip, { status: 201 });
}
