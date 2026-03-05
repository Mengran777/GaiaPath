import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import Prisma client
import { authenticateRequest } from "@/lib/auth"; // Import auth helper

/**
 * Handle POST request to add a new location to a specific trip.
 * Path: /api/trips/{tripId}/locations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params; // Await and destructure tripId

  try {
    const body = await request.json();
    const { name, latitude, longitude, notes, order } = body;

    // Basic validation of required location fields
    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          error: "Missing required location fields: name, latitude, longitude",
        },
        { status: 400 }
      );
    }

    // First, verify the trip exists and belongs to the authenticated user
    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId, userId: authResult.userId },
      select: { id: true }, // Only select ID to confirm existence and ownership
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    // Create new location associated with the trip
    const newLocation = await prisma.location.create({
      data: {
        name,
        latitude,
        longitude,
        notes: notes || "", // Use empty string if notes not provided
        order: order !== undefined ? order : 0, // Use provided order or default to 0
        tripId: tripId, // Associate location with the trip
      },
    });

    // Return the newly created location
    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Error adding location to trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
