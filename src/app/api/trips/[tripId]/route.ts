// src/app/api/trips/[tripId]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import the Prisma client
import { authenticateRequest } from "@/lib/auth"; // Import the authentication helper function

/**
 * Handles GET requests to fetch a specific trip and its locations for the authenticated user.
 * Path: /api/trips/{tripId}
 */
export async function GET(
  request: Request,
  context: { params: { tripId: string } } // Correct type signature for dynamic params
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = context.params; // Access tripId from the context object

  try {
    // Find the unique trip by ID, ensuring it belongs to the authenticated user
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId: authResult.userId, // Crucial for security: ensure user owns the trip
      },
      include: {
        locations: {
          // Include all associated locations for this trip
          orderBy: {
            order: "asc", // Order locations by their 'order' field
          },
        },
      },
    });

    // If trip is not found or doesn't belong to the user, return 404
    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    // Return the detailed trip object including its locations
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
 * Handles PUT requests to update a specific trip's information.
 * Path: /api/trips/{tripId}
 */
export async function PUT(
  request: Request,
  context: { params: { tripId: string } } // Correct type signature for dynamic params
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = context.params; // Access tripId from the context object

  try {
    const body = await request.json();
    const { name, startDate, endDate } = body;

    // First, verify that the trip exists and belongs to the authenticated user
    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId, userId: authResult.userId },
      select: { id: true }, // Select only ID to confirm existence and ownership
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update the trip in the database
    const updatedTrip = await prisma.trip.update({
      where: {
        id: tripId, // Update the specific trip
      },
      data: {
        name: name || undefined, // Only update if 'name' is provided
        startDate: startDate ? new Date(startDate) : undefined, // Convert to Date object if provided
        endDate: endDate ? new Date(endDate) : undefined, // Convert to Date object if provided
      },
      // Select fields to return in the response
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
 * Handles DELETE requests to delete a specific trip.
 * Path: /api/trips/{tripId}
 */
export async function DELETE(
  request: Request,
  context: { params: { tripId: string } } // Correct type signature for dynamic params
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = context.params; // Access tripId from the context object

  try {
    // Delete the trip, ensuring it belongs to the authenticated user.
    // Prisma's deleteMany is used here to ensure the userId condition is applied.
    // If you have CASCADE DELETE set up in your schema, associated locations will also be deleted.
    // Otherwise, you'd need to delete locations first.
    const deleteResult = await prisma.trip.deleteMany({
      where: {
        id: tripId,
        userId: authResult.userId,
      },
    });

    // If no records were deleted, it means the trip was not found or didn't belong to the user.
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
