// src/app/api/trips/[tripId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import Prisma client
import { authenticateRequest } from "@/lib/auth"; // Import auth helper

/**
 * Handle GET request to fetch a specific trip and its locations, ensuring user is authenticated.
 * Path: /api/trips/{tripId}
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await context.params; // Await params resolution

  try {
    // Find trip with locations for the specific user
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId: authResult.userId, // Ensure user owns this trip
      },
      include: {
        locations: {
          orderBy: {
            order: "asc", // Sort by location 'order' field
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(trip, { status: 200 });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT request to update a specific trip's information.
 * Path: /api/trips/{tripId}
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await context.params; // Await params resolution

  try {
    const body = await request.json();
    const { name, startDate, endDate } = body;

    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId, userId: authResult.userId },
      select: { id: true },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        name: name || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    return NextResponse.json(updatedTrip, { status: 200 });
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE request to delete a specific trip.
 * Path: /api/trips/{tripId}
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await context.params; // Await params resolution

  try {
    const deleteResult = await prisma.trip.deleteMany({
      where: {
        id: tripId,
        userId: authResult.userId,
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Trip deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
