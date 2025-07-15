// src/app/api/trips/[tripId]/locations/[locationId]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import the Prisma client
import { authenticateRequest } from "@/lib/auth"; // Import the authentication helper function

/**
 * Helper function to find a location and verify ownership.
 * Ensures the location exists and belongs to the specified trip and user.
 */
async function findLocationAndVerifyOwnership(
  locationId: string,
  tripId: string,
  userId: string
) {
  const location = await prisma.location.findUnique({
    where: {
      id: locationId,
      tripId: tripId,
      trip: {
        userId: userId, // Ensure the trip also belongs to the user
      },
    },
  });
  return location;
}

/**
 * Handles PUT requests to update a specific location within a trip.
 * Path: /api/trips/{tripId}/locations/{locationId}
 */
export async function PUT(
  request: Request,
  { params }: { params: { tripId: string; locationId: string } }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId, locationId } = params;

  try {
    const body = await request.json();
    const { name, latitude, longitude, notes, order } = body;

    // Verify ownership of the location
    const existingLocation = await findLocationAndVerifyOwnership(
      locationId,
      tripId,
      authResult.userId
    );

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update the location in the database
    const updatedLocation = await prisma.location.update({
      where: {
        id: locationId,
      },
      data: {
        name: name || undefined,
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        notes: notes !== undefined ? notes : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
      },
    });

    return NextResponse.json(updatedLocation, { status: 200 });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Handles DELETE requests to delete a specific location within a trip.
 * Path: /api/trips/{tripId}/locations/{locationId}
 */
export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; locationId: string } }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId, locationId } = params;

  try {
    // Verify ownership of the location before deleting
    const existingLocation = await findLocationAndVerifyOwnership(
      locationId,
      tripId,
      authResult.userId
    );

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete the location from the database
    await prisma.location.delete({
      where: {
        id: locationId,
      },
    });

    return NextResponse.json(
      { message: "Location deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
