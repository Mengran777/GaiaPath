// src/app/api/generate-itinerary/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import Prisma client
import { authenticateRequest } from "@/lib/auth"; // Import authentication helper function

/**
 * Handles POST requests to generate an itinerary using AI.
 * Path: /api/generate-itinerary
 */
export async function POST(request: Request) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { preferences } = await request.json(); // Get user preferences from the frontend

    if (!preferences) {
      return NextResponse.json(
        { error: "Missing preferences in request body." },
        { status: 400 }
      );
    }

    // 1. Construct AI Prompt
    const prompt = `
      Please generate a detailed travel itinerary for me based on the following preferences.
      The itinerary should include at least 3 days, with 2-3 activities per day. Each activity should include a title, description, estimated time, optional rating, optional price, and an optional imageUrl.
      Please return the itinerary in JSON array format, as follows:
      [
        {
          "day": 1,
          "title": "Day 1 Itinerary Title",
          "date": "YYYY-MM-DD",
          "activities": [
            {
              "title": "Activity Title 1",
              "description": "Activity description 1",
              "time": "HH:MM-HH:MM",
              "rating": 4.5,
              "price": "100",
              "imageUrl": "https://placehold.co/400x200/FF5733/FFFFFF?text=Activity1"
            },
            {
              "title": "Activity Title 2",
              "description": "Activity description 2",
              "time": "HH:MM-HH:MM",
              "rating": 4.0,
              "price": "50",
              "imageUrl": "https://placehold.co/400x200/33FF57/FFFFFF?text=Activity2"
            }
          ]
        }
        // ... more days
      ]

      Travel Preferences:
      Destination: ${preferences.destination || "Any"}
      Travel Start Date: ${preferences.travelStartDate || "Any"}
      Travel End Date: ${preferences.travelEndDate || "Any"}
      Budget: ¥${
        preferences.budget ? preferences.budget.toLocaleString() : "Any"
      }
      Number of Travelers: ${preferences.travelers || "Any"}
      Travel Type: ${
        preferences.travelType && preferences.travelType.length > 0
          ? preferences.travelType.join(", ")
          : "Any"
      }
      Accommodation Preference: ${preferences.accommodation || "Any"}
      Transportation Preference: ${
        preferences.transportation && preferences.transportation.length > 0
          ? preferences.transportation.join(", ")
          : "Any"
      }
      Activity Intensity: ${preferences.activityIntensity || "Any"}
      Special Needs: ${
        preferences.specialNeeds && preferences.specialNeeds.length > 0
          ? preferences.specialNeeds.join(", ")
          : "None"
      }

      Please ensure all imageUrls use the format https://placehold.co/{width}x{height}/{background color in hex}/{text color in hex}?text={text} and replace the text and colors to be relevant to the activity content.
      Please ensure the generated JSON is valid and contains only JSON data, without any additional text or explanations.
    `;

    // 2. Call Gemini API
    const apiKey = ""; // Canvas will automatically provide API Key at runtime
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json", // Request JSON format response
        // You can define responseSchema here for better accuracy if needed
      },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate itinerary from AI", details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    const aiGeneratedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiGeneratedText) {
      return NextResponse.json(
        { error: "AI did not return valid content." },
        { status: 500 }
      );
    }

    // 3. Parse AI Response (expected to be JSON)
    let generatedItineraryData: any[];
    try {
      generatedItineraryData = JSON.parse(aiGeneratedText);
      if (!Array.isArray(generatedItineraryData)) {
        throw new Error("AI response is not a JSON array.");
      }
    } catch (parseError) {
      console.error(
        "Failed to parse AI generated JSON:",
        parseError,
        aiGeneratedText
      );
      return NextResponse.json(
        { error: "AI generated invalid JSON format." },
        { status: 500 }
      );
    }

    // 4. Save AI-generated itinerary to the database
    const tripName = preferences.destination
      ? `${preferences.destination} Trip`
      : "AI Generated Itinerary";
    const tripStartDate = preferences.travelStartDate
      ? new Date(preferences.travelStartDate)
      : new Date();
    const tripEndDate = preferences.travelEndDate
      ? new Date(preferences.travelEndDate)
      : new Date(new Date().setDate(new Date().getDate() + 3));

    const newTrip = await prisma.trip.create({
      data: {
        name: tripName,
        startDate: tripStartDate,
        endDate: tripEndDate,
        userId: authResult.userId,
        locations: {
          create: generatedItineraryData.flatMap((day) =>
            day.activities.map((activity: any, index: number) => ({
              name: activity.title,
              latitude: activity.latitude || 0, // AI might not provide lat/lon, use default or geocoding
              longitude: activity.longitude || 0, // Same as above
              notes: `${activity.description || ""} (${activity.time || ""})`,
              order: day.day * 100 + index, // Simple ordering
            }))
          ),
        },
      },
      include: {
        locations: true,
      },
    });

    // Return AI generated itinerary data (and potentially database IDs)
    return NextResponse.json(generatedItineraryData, { status: 200 });
  } catch (error) {
    console.error("Error in AI itinerary generation API:", error);
    return NextResponse.json(
      { error: "Internal Server Error during AI generation" },
      { status: 500 }
    );
  }
}
