// src/app/api/trips/[tripId]/locations/[locationId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

/**
 * Helper function to find a location and verify ownership.
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
        userId: userId,
      },
    },
  });
  return location;
}

/**
 * PUT: Update a specific location within a trip
 */
export async function PUT(
  request: NextRequest,
  context: { params: Record<string, string> } // ✅ 类型修复
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId, locationId } = context.params;

  try {
    const body = await request.json();
    const { name, latitude, longitude, notes, order } = body;

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

    const updatedLocation = await prisma.location.update({
      where: { id: locationId },
      data: {
        name: name || undefined,
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        notes: notes ?? undefined,
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
 * DELETE: Remove a specific location from a trip
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Record<string, string> } // ✅ 类型修复
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId, locationId } = context.params;

  try {
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

    await prisma.location.delete({ where: { id: locationId } });

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
