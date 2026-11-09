// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import prisma from "@/lib/db";

// GET: Get all user favorite routes
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing token" },
        { status: 401 }
      );
    }

    const { userId } = authResult;

    // Get all user favorites from database
    const favorites = await prisma.favoriteRoute.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc", // Latest favorites first
      },
    });

    // Parse JSON data and return
    const routesData = favorites.map((fav: any) => ({
      ...JSON.parse(fav.routeData),
      favoriteId: fav.id, // Add favorite record ID for easy deletion
    }));

    return NextResponse.json(routesData, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Add or remove favorite
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing token" },
        { status: 401 }
      );
    }

    const { userId } = authResult;

    const body = await request.json();
    const { routeId, routeData, action } = body;

    if (!routeId) {
      return NextResponse.json(
        { error: "Missing required field: routeId" },
        { status: 400 }
      );
    }

    if (action === "remove") {
      // Remove favorite
      await prisma.favoriteRoute.deleteMany({
        where: {
          userId: userId,
          routeId: routeId,
        },
      });

      return NextResponse.json(
        { message: "Favorite removed successfully", routeId },
        { status: 200 }
      );
    } else if (action === "add") {
      // Add favorite
      if (!routeData) {
        return NextResponse.json(
          { error: "Missing required field: routeData" },
          { status: 400 }
        );
      }

      // Strip the response-only field GET adds, so it isn't stored back
      const { favoriteId: _ignored, ...cleanRouteData } = routeData;

      // Upsert: re-sending an already-favorited route updates its stored
      // content — this is how edits to a favorited route get persisted.
      const favorite = await prisma.favoriteRoute.upsert({
        where: { userId_routeId: { userId, routeId } },
        create: {
          userId,
          routeId,
          routeData: JSON.stringify(cleanRouteData),
        },
        update: { routeData: JSON.stringify(cleanRouteData) },
      });

      return NextResponse.json(
        { message: "Favorite saved", favoriteId: favorite.id, routeId },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'add' or 'remove'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error managing favorite:", error);
    return NextResponse.json(
      { error: "Failed to manage favorite", details: error.message },
      { status: 500 }
    );
  }
}
