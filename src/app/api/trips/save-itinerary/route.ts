// src/app/api/trips/save-itinerary/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { DayItinerary } from "@/types/itinerary";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { routeId, name, startDate, endDate, itinerary, routeMeta } = body as {
    routeId: string;
    name: string;
    startDate: string;
    endDate: string;
    itinerary: DayItinerary[];
    routeMeta: Record<string, unknown>;
  };

  if (!routeId || !name || !startDate || !endDate || !itinerary) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const parsedStart = new Date(startDate);
  const parsedEnd = new Date(endDate);
  if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const itineraryDataJson = JSON.stringify(itinerary);
  const routeMetaJson = JSON.stringify(routeMeta ?? {});

  // Build flat location records from DayItinerary[]
  const locationRecords = itinerary.flatMap((day: DayItinerary) =>
    day.activities.map((activity, idx) => ({
      name: activity.title,
      description: activity.description ?? null,
      latitude: activity.latitude ?? 0,
      longitude: activity.longitude ?? 0,
      order: day.day * 1000 + idx,
      time: activity.time ?? null,
      rating: activity.rating ?? null,
      price: activity.price ?? null,
      imageUrl: activity.imageUrl ?? null,
    }))
  );

  // Upsert: if a trip with this routeId already exists for this user, update it
  const existing = await prisma.trip.findFirst({
    where: { userId: auth.userId, routeId },
    select: { id: true },
  });

  let tripId: string;

  if (existing) {
    // Delete old locations then update trip
    await prisma.location.deleteMany({ where: { tripId: existing.id } });
    await prisma.trip.update({
      where: { id: existing.id },
      data: {
        name,
        startDate: parsedStart,
        endDate: parsedEnd,
        itineraryData: itineraryDataJson,
        routeMeta: routeMetaJson,
        locations: { create: locationRecords },
      },
    });
    tripId = existing.id;
  } else {
    const newTrip = await prisma.trip.create({
      data: {
        name,
        startDate: parsedStart,
        endDate: parsedEnd,
        routeId,
        itineraryData: itineraryDataJson,
        routeMeta: routeMetaJson,
        userId: auth.userId,
        locations: { create: locationRecords },
      },
      select: { id: true },
    });
    tripId = newTrip.id;
  }

  return NextResponse.json({ tripId, routeId }, { status: 200 });
}
