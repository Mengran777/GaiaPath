// src/app/api/trips/[tripId]/locations/[locationId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import Prisma client
import { authenticateRequest } from "@/lib/auth"; // Import auth helper

/**
 * Helper function: Find a location and verify ownership.
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
        userId: userId, // Ensure the trip also belongs to this user
      },
    },
  });
  return location;
}

/**
 * Handle PUT request: Update a specific location in a trip.
 * Path: /api/trips/{tripId}/locations/{locationId}
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tripId: string; locationId: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await dynamic params resolution
  const { tripId, locationId } = await context.params;

  try {
    const body = await request.json();
    const { name, latitude, longitude, notes, order } = body;

    // Verify location ownership
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

    // Update location in database
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
 * Handle DELETE request: Delete a specific location from a trip.
 * Path: /api/trips/{tripId}/locations/{locationId}
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tripId: string; locationId: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await dynamic params resolution
  const { tripId, locationId } = await context.params;

  try {
    // Verify location ownership
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

    // Delete location from database
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
